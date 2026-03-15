"""
SWIFT FIN message parser.
Extracts blocks, detects MT type, parses field tags into structured JSON,
and looks up field meanings from SwiftParameter table.
"""
import re
from datetime import datetime


# ── MT Type descriptions ─────────────────────────────────────────────────
MT_DESCRIPTIONS = {
    'MT103': 'Single Customer Credit Transfer',
    'MT202': 'General Financial Institution Transfer',
    'MT210': 'Notice to Receive',
    'MT300': 'Foreign Exchange Confirmation',
    'MT320': 'Fixed Deposit Confirmation',
    'MT540': 'Receive Free (Securities)',
    'MT541': 'Receive Against Payment (Securities)',
    'MT542': 'Deliver Free (Securities)',
    'MT543': 'Deliver Against Payment (Securities)',
    'MT544': 'Receive Free Confirmation',
    'MT545': 'Receive Against Payment Confirmation',
    'MT546': 'Deliver Free Confirmation',
    'MT547': 'Deliver Against Payment Confirmation',
    'MT548': 'Settlement Status and Processing Advice',
    'MT564': 'Corporate Action Notification',
    'MT565': 'Corporate Action Instruction',
    'MT566': 'Corporate Action Confirmation',
    'MT567': 'Corporate Action Status and Processing Advice',
    'MT700': 'Issue of a Documentary Credit',
    'MT799': 'Free Format Message (Trade Finance)',
    'MT900': 'Confirmation of Debit',
    'MT910': 'Confirmation of Credit',
    'MT940': 'Customer Statement Message',
    'MT942': 'Interim Transaction Report',
    'MT950': 'Statement Message (Correspondent)',
    'MT199': 'Free Format Message (Payments)',
    'MT299': 'Free Format Message (Treasury)',
}


def parse_swift_message(raw_text):
    """
    Parse a complete SWIFT FIN message into structured data.

    Returns dict:
        {
            'message_type': 'MT541',
            'message_type_description': 'Receive Against Payment (Securities)',
            'sender_bic': 'PNBMMYKLXXX',
            'receiver_bic': 'AMTBMYKLXXX',
            'reference': 'PNB/20250710/A538',
            'blocks': { '1': '...', '2': '...', '3': '...', '5': '...' },
            'fields': [ { tag, qualifier, raw, value, display, sequence }, ... ],
        }
    """
    # Clean the raw text
    text = raw_text.strip()

    # Extract blocks
    blocks = _extract_blocks(text)

    # Detect MT type from Block 2
    mt_type, sender_bic, receiver_bic = _detect_mt_type(blocks)

    # Parse Block 4 (message body)
    fields = _parse_block4(blocks.get('4', ''))

    # Extract primary reference
    reference = _extract_reference(fields)

    # Look up field meanings from SwiftParameter table
    _enrich_with_parameters(mt_type, fields)

    return {
        'message_type': mt_type,
        'message_type_description': MT_DESCRIPTIONS.get(mt_type, ''),
        'sender_bic': sender_bic,
        'receiver_bic': receiver_bic,
        'reference': reference,
        'blocks': {k: v for k, v in blocks.items() if k != '4'},
        'fields': fields,
    }


def _extract_blocks(text):
    """Extract SWIFT blocks {1:...}{2:...}{3:...}{4:...}{5:...}"""
    blocks = {}

    # Block 1-3 and 5: simple {N:content}
    for match in re.finditer(r'\{([1-3,5]):([^}]*(?:\{[^}]*\})*[^}]*)\}', text):
        blocks[match.group(1)] = match.group(2)

    # Block 4: starts with {4: and ends with -}
    m4 = re.search(r'\{4:\s*\n?(.*?)(?:\n-\}|-\})', text, re.DOTALL)
    if m4:
        blocks['4'] = m4.group(1).strip()

    return blocks


def _detect_mt_type(blocks):
    """
    Extract MT type, sender BIC, receiver BIC from blocks 1 and 2.
    Block 1: F01PNBMMYKLXXX1234567890  → sender = PNBMMYKLXXX (pos 3-14)
    Block 2: O5431405250710AMTBMYKLXXX → MT = 543 (pos 1-4), receiver after date
             I541AMTBMYKLXXX           → MT = 541 (pos 1-4), receiver = pos 4+
    """
    sender_bic = ''
    receiver_bic = ''
    mt_type = 'UNKNOWN'

    # Block 1 → sender BIC
    b1 = blocks.get('1', '')
    if len(b1) >= 14:
        sender_bic = b1[3:14].strip()  # Skip "F01"

    # Block 2 → MT type + receiver
    b2 = blocks.get('2', '')
    if b2:
        direction = b2[0] if b2 else ''
        if direction == 'O':
            # Output: O543HHMM... receiver BIC starts after date
            mt_num = b2[1:4]
            mt_type = f'MT{mt_num}'
            # Receiver is in Block 1 (sender_bic is actually the logical receiver for copies)
            # The actual receiver BIC is at position 14-25 in block 2
            if len(b2) >= 25:
                receiver_bic = b2[14:25].strip()
        elif direction == 'I':
            # Input: I541RECEIVERBIC...
            mt_num = b2[1:4]
            mt_type = f'MT{mt_num}'
            # Receiver BIC starts at position 4
            receiver_bic = b2[4:15].strip()

    return mt_type, sender_bic, receiver_bic


def _parse_block4(body):
    """
    Parse Block 4 text into a list of field dicts.
    Handles:
      - Simple fields: :20:REF123
      - Qualified fields: :98A::TRAD//20250710
      - Multi-line fields: :35B:ISIN...\nDESCRIPTION
      - Block delimiters: :16R:GENL / :16S:GENL
    """
    if not body:
        return []

    fields = []
    lines = body.split('\n')
    current_sequence = ''
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Match field tag pattern: :XX: or :XXx:
        tag_match = re.match(r'^:(\d{2}[A-Z]?):(.*)$', line)
        if tag_match:
            tag = tag_match.group(1)
            rest = tag_match.group(2)

            # Collect continuation lines (lines that don't start with : tag)
            i += 1
            while i < len(lines):
                next_line = lines[i].strip()
                if not next_line or re.match(r'^:(\d{2}[A-Z]?):', next_line):
                    break
                rest += '\n' + next_line
                i += 1

            # Track sequences via 16R/16S
            if tag == '16R':
                current_sequence = rest.strip()
            elif tag == '16S':
                pass  # End of sequence, keep current_sequence for the closing tag

            # Parse the field value
            field = _parse_field_value(tag, rest, current_sequence)
            fields.append(field)

            if tag == '16S':
                current_sequence = ''
        else:
            i += 1

    return fields


def _parse_field_value(tag, raw_value, sequence=''):
    """
    Parse a field's raw value into structured components.

    Examples:
      :98A::TRAD//20250710    → qualifier=TRAD, value=2025-07-10
      :95P::BUYR//PNBMMYKLXXX → qualifier=BUYR, value=PNBMMYKLXXX
      :90B::DEAL//ACTU/MYR125.50 → qualifier=DEAL, value=ACTU | MYR 125.50
      :36B::SETT//UNIT/100000 → qualifier=SETT, value=UNIT | 100,000
      :20:REF123              → qualifier='', value=REF123
    """
    raw_value = raw_value.strip()
    qualifier = ''
    value = raw_value
    display_parts = []

    # Check for qualified format: :QUALIFIER//VALUE (single : because tag regex consumed one)
    qual_match = re.match(r'^:([A-Z0-9]+)//(.*)', raw_value, re.DOTALL)
    if qual_match:
        qualifier = qual_match.group(1)
        value = qual_match.group(2).strip()
        display_parts.append(qualifier)

        # Split sub-values by / but keep the full value intact
        sub_parts = [p for p in value.split('/') if p]
        formatted_parts = []
        for part in sub_parts:
            formatted_parts.append(_format_value(tag, qualifier, part))

        if formatted_parts:
            display_parts.extend(formatted_parts)
        else:
            display_parts.append(value)
    else:
        # Simple field — format the value
        value = raw_value.replace('\n', ' ').strip()
        display_parts.append(_format_value(tag, '', value))

    display = ' | '.join(display_parts)

    return {
        'tag': tag,
        'qualifier': qualifier,
        'raw': f':{tag}:{raw_value}',
        'value': value,
        'display': display,
        'sequence': sequence,
        'field_name': '',
        'description': '',
    }


def _format_value(tag, qualifier, value):
    """
    Smart-format a value based on context:
    - Dates (8 digits): 20250710 → 2025-07-10
    - Amounts (currency + number): MYR12550000.00 → MYR 12,550,000.00
    - Numbers: 100000 → 100,000
    """
    if not value:
        return value

    # Date formatting: 8 digits that look like YYYYMMDD
    if re.match(r'^\d{8}$', value):
        try:
            dt = datetime.strptime(value, '%Y%m%d')
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            pass

    # DateTime formatting: 14 digits YYYYMMDDHHMMSS
    if re.match(r'^\d{14}$', value):
        try:
            dt = datetime.strptime(value, '%Y%m%d%H%M%S')
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            pass

    # Amount formatting: CCY + number (e.g. MYR12550000.00 or USD500000.00)
    amt_match = re.match(r'^([A-Z]{3})(\d+(?:[.,]\d+)?)$', value)
    if amt_match:
        ccy = amt_match.group(1)
        num_str = amt_match.group(2).replace(',', '.')
        try:
            num = float(num_str)
            return f'{ccy} {num:,.2f}'
        except ValueError:
            pass

    # Date in amount fields: 6-digit date prefix (YYMMDD)
    # e.g. in :32A:250714USD500000.00
    date_amt = re.match(r'^(\d{6})([A-Z]{3})(\d+(?:[.,]\d+)?)$', value)
    if date_amt:
        try:
            dt = datetime.strptime(date_amt.group(1), '%y%m%d')
            ccy = date_amt.group(2)
            num = float(date_amt.group(3).replace(',', '.'))
            return f'{dt.strftime("%Y-%m-%d")} {ccy} {num:,.2f}'
        except (ValueError, OverflowError):
            pass

    # Plain large number formatting
    if re.match(r'^\d{4,}[,.]?\d*$', value):
        try:
            num = float(value.replace(',', '.'))
            if num == int(num):
                return f'{int(num):,}'
            return f'{num:,.2f}'
        except ValueError:
            pass

    return value


def _extract_reference(fields):
    """Extract the primary reference from parsed fields."""
    # Priority 1: :20C::SEME// reference (keep full value including slashes)
    for f in fields:
        if f['tag'] == '20C' and f['qualifier'] == 'SEME':
            return f['value']

    # Priority 2: :20: simple reference
    for f in fields:
        if f['tag'] == '20' and not f['qualifier']:
            return f['display']

    return ''


def _enrich_with_parameters(mt_type, fields):
    """
    Look up field meanings from SwiftParameter table.
    Matches by message_type and field_tag.
    """
    try:
        from .models import SwiftParameter

        # Build lookup caches for this MT type
        params = SwiftParameter.objects.filter(
            category='MT',
            message_type=mt_type,
            status='active',
        ).values('field_tag', 'field_name', 'description')

        lookup = {}
        for p in params:
            # DB stores tags as ":20C:" — strip colons for matching
            tag_clean = p['field_tag'].strip(':')
            lookup[tag_clean] = (p['field_name'], p['description'])

        for field in fields:
            tag = field['tag']
            if tag in lookup:
                field['field_name'] = lookup[tag][0]
                field['description'] = lookup[tag][1]

    except Exception:
        pass  # If DB not available, fields just won't have meanings


def is_swift_message(text):
    """Quick check if text content looks like a SWIFT FIN message."""
    return bool(re.search(r'\{1:F\d{2}', text))
