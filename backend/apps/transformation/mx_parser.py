"""
SWIFT MX (ISO 20022) XML message parser.
Parses DataPDU/BAH-wrapped XML messages into structured JSON,
detects message type (e.g. pacs.008), and extracts key fields.

Supports: pacs, camt, pain, sese, semt and other ISO 20022 message families.
"""
import re
from xml.etree import ElementTree as ET


# ── MX Type descriptions ─────────────────────────────────────────────────
MX_DESCRIPTIONS = {
    # pacs — Payments Clearing and Settlement
    'pacs.002': 'Payment Status Report',
    'pacs.003': 'FI to FI Customer Direct Debit',
    'pacs.004': 'Payment Return',
    'pacs.007': 'FI to FI Payment Reversal',
    'pacs.008': 'FI to FI Customer Credit Transfer',
    'pacs.009': 'Financial Institution Credit Transfer',
    'pacs.010': 'Financial Institution Direct Debit',
    'pacs.028': 'Payment Status Request',
    'pacs.029': 'Payment Status Report (Positive)',

    # camt — Cash Management
    'camt.003': 'Get Account',
    'camt.004': 'Return Account',
    'camt.005': 'Get Transaction',
    'camt.006': 'Return Transaction',
    'camt.007': 'Modify Transaction',
    'camt.008': 'Cancel Transaction',
    'camt.026': 'Unable to Apply',
    'camt.027': 'Claim Non-Receipt',
    'camt.028': 'Additional Payment Information',
    'camt.029': 'Resolution of Investigation',
    'camt.030': 'Notification of Case Assignment',
    'camt.031': 'Reject Investigation',
    'camt.033': 'Request for Duplicate',
    'camt.034': 'Duplicate',
    'camt.052': 'Bank to Customer Account Report',
    'camt.053': 'Bank to Customer Statement',
    'camt.054': 'Bank to Customer Debit/Credit Notification',
    'camt.055': 'Customer Payment Cancellation Request',
    'camt.056': 'FI to FI Payment Cancellation Request',
    'camt.057': 'Notification to Receive',
    'camt.058': 'Notification to Receive Cancel Advice',
    'camt.059': 'Notification to Receive Status Report',
    'camt.060': 'Account Reporting Request',

    # pain — Payments Initiation
    'pain.001': 'Customer Credit Transfer Initiation',
    'pain.002': 'Customer Payment Status Report',
    'pain.007': 'Customer Payment Reversal',
    'pain.008': 'Customer Direct Debit Initiation',
    'pain.013': 'Creditor Payment Activation Request',
    'pain.014': 'Creditor Payment Activation Request Status Report',

    # sese — Securities Settlement
    'sese.020': 'Securities Transaction Cancellation Request',
    'sese.023': 'Securities Settlement Transaction Instruction',
    'sese.024': 'Securities Settlement Transaction Status Advice',
    'sese.025': 'Securities Settlement Transaction Confirmation',
    'sese.026': 'Securities Settlement Transaction Reversal Advice',
    'sese.027': 'Securities Transaction Cancellation Request Status Advice',
    'sese.028': 'Securities Settlement Condition Modification Request',
    'sese.032': 'Securities Settlement Transaction Generation Notification',
    'sese.033': 'Securities Financing Instruction',
    'sese.034': 'Securities Financing Status Advice',
    'sese.035': 'Securities Financing Confirmation',

    # semt — Securities Management
    'semt.002': 'Custody Statement of Holdings',
    'semt.003': 'Intra-Position Movement Instruction',
    'semt.013': 'Intra-Position Movement Posting Report',
    'semt.014': 'Intra-Position Movement Status Advice',
    'semt.017': 'Securities Transaction Posting Report',
    'semt.018': 'Securities Transaction Pending Report',
    'semt.020': 'Securities Message Cancellation Advice',
    'semt.021': 'Return of Holding',

    # seev — Securities Events (Corporate Actions)
    'seev.031': 'Corporate Action Notification',
    'seev.033': 'Corporate Action Instruction',
    'seev.034': 'Corporate Action Instruction Status Advice',
    'seev.035': 'Corporate Action Movement Preliminary Advice',
    'seev.036': 'Corporate Action Movement Confirmation',
    'seev.037': 'Corporate Action Movement Reversal Advice',
    'seev.039': 'Corporate Action Cancellation Advice',
    'seev.044': 'Corporate Action Event Processing Status Advice',

    # head — Business Application Header
    'head.001': 'Business Application Header',

    # admi — Administration
    'admi.002': 'System Event Notification',
    'admi.004': 'System Event Acknowledgement',
}

# ── Comprehensive field label mappings ────────────────────────────────
FIELD_LABELS = {
    # ── Header / AppHdr ──
    'SenderReference': ('Sender Reference', 'Unique reference assigned by the sender'),
    'MessageIdentifier': ('Message Identifier', 'ISO 20022 message type identifier'),
    'Format': ('Format', 'Message format (MX)'),
    'Revision': ('Revision', 'Schema revision version'),
    'BizMsgIdr': ('Business Message ID', 'Unique business message identifier'),
    'MsgDefIdr': ('Message Definition ID', 'ISO 20022 message schema identifier'),
    'BizSvc': ('Business Service', 'SWIFT business service name'),
    'CreDt': ('Creation Date', 'Message creation date and time'),
    'X1': ('BIC', 'Bank Identifier Code'),
    'DN': ('Distinguished Name', 'SWIFT network distinguished name'),
    'Service': ('Service', 'SWIFT network service name'),
    'RequestSubtype': ('Request Subtype', 'Network request subtype'),
    'CopyDplct': ('Copy/Duplicate', 'Indicator if message is copy or duplicate'),
    'PssblDplct': ('Possible Duplicate', 'Indicates if this might be a duplicate'),

    # ── Group Header ──
    'MsgId': ('Message ID', 'Unique message identifier in group header'),
    'CreDtTm': ('Creation DateTime', 'Date and time the message was created'),
    'NbOfTxs': ('Number of Transactions', 'Total transactions in the message'),
    'CtrlSum': ('Control Sum', 'Total sum of amounts for validation'),
    'TtlIntrBkSttlmAmt': ('Total Settlement Amount', 'Total interbank settlement amount'),
    'IntrBkSttlmDt': ('Settlement Date', 'Interbank settlement date'),
    'SttlmMtd': ('Settlement Method', 'INDA=Account, CLRG=Clearing, COVE=Cover, INGA=Agent'),
    'ClrSys': ('Clearing System', 'Clearing system identification'),
    'Cd': ('Code', 'Code value'),
    'Prtry': ('Proprietary', 'Proprietary identification'),
    'SchmeNm': ('Scheme Name', 'Identification scheme name'),

    # ── Payment ID ──
    'InstrId': ('Instruction ID', 'Unique instruction identifier from sender'),
    'EndToEndId': ('End to End ID', 'Unique reference from initiating party'),
    'UETR': ('UETR', 'Unique End-to-End Transaction Reference (UUID)'),
    'TxId': ('Transaction ID', 'Transaction identification'),
    'ClrSysRef': ('Clearing System Ref', 'Reference from clearing system'),

    # ── Amounts ──
    'IntrBkSttlmAmt': ('Settlement Amount', 'Interbank settlement amount'),
    'InstdAmt': ('Instructed Amount', 'Amount instructed by the debtor'),
    'EqvtAmt': ('Equivalent Amount', 'Equivalent amount in different currency'),
    'XchgRate': ('Exchange Rate', 'Currency exchange rate applied'),
    'ChrgBr': ('Charge Bearer', 'DEBT=Debtor, CRED=Creditor, SHAR=Shared, SLEV=Service Level'),
    'ChrgsInf': ('Charges Info', 'Details of charges applied'),
    'Amt': ('Amount', 'Transaction amount'),
    'Ccy': ('Currency', 'ISO currency code'),
    'TtlChrgsAndTaxAmt': ('Total Charges', 'Total charges and tax amount'),

    # ── Parties ──
    'InstgAgt': ('Instructing Agent', 'Financial institution sending the instruction'),
    'InstdAgt': ('Instructed Agent', 'Financial institution receiving the instruction'),
    'Dbtr': ('Debtor', 'Party that owes the payment'),
    'DbtrAcct': ('Debtor Account', 'Account of the debtor'),
    'DbtrAgt': ('Debtor Agent', 'Bank of the debtor'),
    'CdtrAgt': ('Creditor Agent', 'Bank of the creditor'),
    'Cdtr': ('Creditor', 'Party receiving the payment'),
    'CdtrAcct': ('Creditor Account', 'Account of the creditor'),
    'IntrmyAgt1': ('Intermediary Agent 1', 'First intermediary bank'),
    'IntrmyAgt2': ('Intermediary Agent 2', 'Second intermediary bank'),
    'IntrmyAgt3': ('Intermediary Agent 3', 'Third intermediary bank'),
    'InitgPty': ('Initiating Party', 'Party that initiated the payment'),
    'FwdgAgt': ('Forwarding Agent', 'Agent that forwarded the message'),
    'UltmtDbtr': ('Ultimate Debtor', 'Ultimate party that owes the payment'),
    'UltmtCdtr': ('Ultimate Creditor', 'Ultimate party receiving the payment'),

    # ── Financial Institution ID ──
    'BICFI': ('BIC', 'Bank Identifier Code (SWIFT BIC)'),
    'ClrSysMmbId': ('Clearing Member ID', 'Clearing system member identification'),
    'LEI': ('LEI', 'Legal Entity Identifier'),
    'FinInstnId': ('FI Identification', 'Financial institution identification'),

    # ── Party / Name / Address ──
    'Nm': ('Name', 'Party name'),
    'PstlAdr': ('Postal Address', 'Party postal address'),
    'StrtNm': ('Street Name', 'Street name'),
    'BldgNb': ('Building Number', 'Building number'),
    'PstCd': ('Post Code', 'Postal code'),
    'TwnNm': ('Town Name', 'Town or city name'),
    'CtrySubDvsn': ('Country Subdivision', 'State or province'),
    'Ctry': ('Country', 'ISO country code'),
    'AdrLine': ('Address Line', 'Free-form address line'),

    # ── Accounts ──
    'IBAN': ('IBAN', 'International Bank Account Number'),
    'Id': ('Identification', 'Account or party identification'),
    'Othr': ('Other ID', 'Other identification'),
    'Tp': ('Type', 'Type classification'),
    'SttlmAcct': ('Settlement Account', 'Settlement account identification'),
    'Acct': ('Account', 'Account identification'),

    # ── Remittance / Purpose ──
    'RmtInf': ('Remittance Info', 'Remittance information'),
    'Ustrd': ('Unstructured', 'Unstructured remittance text'),
    'Strd': ('Structured', 'Structured remittance data'),
    'Purp': ('Purpose', 'Purpose of the payment'),
    'RgltryRptg': ('Regulatory Reporting', 'Required regulatory reporting info'),
    'InstrForCdtrAgt': ('Instruction for Creditor Agent', 'Instructions for creditor bank'),
    'InstrForNxtAgt': ('Instruction for Next Agent', 'Instructions for next agent in chain'),

    # ── Status (pacs.002, camt.029) ──
    'OrgnlMsgId': ('Original Message ID', 'ID of original message'),
    'OrgnlMsgNmId': ('Original Message Name', 'Original message type name'),
    'OrgnlCreDtTm': ('Original Creation DateTime', 'Creation time of original message'),
    'OrgnlNbOfTxs': ('Original Nb of Txs', 'Number of transactions in original'),
    'GrpSts': ('Group Status', 'Overall status of the group'),
    'TxSts': ('Transaction Status', 'Status of payment transaction'),
    'StsRsnInf': ('Status Reason', 'Reason for the status'),
    'Rsn': ('Reason', 'Reason code'),
    'AddtlInf': ('Additional Info', 'Additional information'),
    'OrgnlEndToEndId': ('Original End to End ID', 'Original end-to-end reference'),
    'OrgnlTxId': ('Original Transaction ID', 'Original transaction ID'),
    'OrgnlInstrId': ('Original Instruction ID', 'Original instruction ID'),
    'OrgnlGrpInfAndSts': ('Original Group Status', 'Status of original message group'),
    'OrgnlTxRef': ('Original Transaction Ref', 'Reference data from original transaction'),
    'StsId': ('Status ID', 'Unique status identification'),

    # ── camt.053/054 Statement fields ──
    'Bal': ('Balance', 'Account balance'),
    'TpBal': ('Balance Type', 'Type of balance (OPBD, CLBD, FWAV)'),
    'CdtDbtInd': ('Credit/Debit', 'Indicates credit or debit'),
    'Dt': ('Date', 'Date'),
    'DtTm': ('DateTime', 'Date and time'),
    'Ntry': ('Entry', 'Statement entry / transaction'),
    'Ref': ('Reference', 'Entry reference'),
    'ValDt': ('Value Date', 'Entry value date'),
    'BkTxCd': ('Bank Transaction Code', 'Bank transaction code'),
    'Domn': ('Domain', 'Domain of the bank transaction'),
    'Fmly': ('Family', 'Transaction family code'),
    'SubFmly': ('Sub-Family', 'Transaction sub-family code'),
    'NtryDtls': ('Entry Details', 'Details of the entry'),
    'Btch': ('Batch', 'Batch details'),
    'TxDtls': ('Transaction Details', 'Individual transaction details'),
    'Refs': ('References', 'References for the transaction'),
    'AcctId': ('Account ID', 'Account identification'),
    'Stmt': ('Statement', 'Account statement'),
    'Rpt': ('Report', 'Account report'),
    'Ntfctn': ('Notification', 'Debit/credit notification'),
    'FrToDt': ('From/To Date', 'Statement period'),
    'FrDt': ('From Date', 'Start date of period'),
    'ToDt': ('To Date', 'End date of period'),
    'ElctrncSeqNb': ('Electronic Sequence', 'Electronic sequence number'),
    'LglSeqNb': ('Legal Sequence', 'Legal sequence number'),
    'Acct': ('Account', 'Account identification'),

    # ── Securities (sese, semt) ──
    'TradDt': ('Trade Date', 'Date of trade execution'),
    'SttlmDt': ('Settlement Date', 'Date of settlement'),
    'FinInstrmId': ('Financial Instrument', 'Identification of security'),
    'ISIN': ('ISIN', 'International Securities Identification Number'),
    'Desc': ('Description', 'Security description'),
    'ClssfctnTp': ('Classification', 'Security classification type'),
    'SttlmQty': ('Settlement Quantity', 'Quantity being settled'),
    'Unit': ('Units', 'Number of units'),
    'FaceAmt': ('Face Amount', 'Face amount of the security'),
    'SfkpgPlc': ('Safekeeping Place', 'Place of safekeeping'),
    'SttlmPties': ('Settlement Parties', 'Parties involved in settlement'),
    'Dlvr': ('Delivering', 'Delivering party'),
    'Rcvr': ('Receiving', 'Receiving party'),
    'PlcOfTrad': ('Place of Trade', 'Market or exchange'),
    'MktId': ('Market ID', 'Market identification'),
    'DealPric': ('Deal Price', 'Price of the deal'),
    'PricVal': ('Price Value', 'Price value'),
    'SttlmAmt': ('Settlement Amount', 'Amount to be settled'),
    'AcctOwnr': ('Account Owner', 'Owner of the account'),
    'SfkpgAcct': ('Safekeeping Account', 'Securities safekeeping account'),

    # ── Corporate Actions (seev) ──
    'CorpActnGnlInf': ('CA General Info', 'Corporate action general information'),
    'EvtTp': ('Event Type', 'Type of corporate action event'),
    'CorpActnEvtId': ('CA Event ID', 'Corporate action event identifier'),
    'CorpActnDtls': ('CA Details', 'Corporate action details'),
    'CorpActnOptnDtls': ('CA Option Details', 'Option details for corporate action'),
    'OptnNb': ('Option Number', 'Option number'),
    'OptnTp': ('Option Type', 'Type of option'),
    'InstrQty': ('Instruction Quantity', 'Instructed quantity'),
}


def parse_mx_message(raw_text):
    """
    Parse a SWIFT MX (ISO 20022 XML) message into structured data.

    Returns dict with same structure as MT parser for compatibility:
        {
            'message_type': 'pacs.008',
            'message_type_full': 'pacs.008.001.08',
            'message_type_description': 'FI to FI Customer Credit Transfer',
            'sender_bic': 'PERMMYKGXXX',
            'receiver_bic': 'PARBSGSGXXX',
            'reference': '2025111802862101',
            'blocks': {},
            'fields': [ { tag, qualifier, raw, value, display, sequence, field_name, description, xpath }, ... ],
        }
    """
    # Clean the raw text — fix PDF artifacts like "utf -8" -> "utf-8"
    text = _clean_xml_text(raw_text)

    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        # Try extracting XML from surrounding text
        xml_match = re.search(r'(<\?xml.*?</DataPDU>)', text, re.DOTALL)
        if not xml_match:
            xml_match = re.search(r'(<DataPDU[^>]*>.*?</DataPDU>)', text, re.DOTALL)
        if xml_match:
            try:
                root = ET.fromstring(xml_match.group(1))
            except ET.ParseError:
                return _empty_result('Failed to parse XML')
        else:
            return _empty_result('No XML found')

    # Extract header info
    sender_bic, receiver_bic, msg_id_full, sender_ref = _extract_header(root)

    # Determine MX type
    msg_type_short = _short_mx_type(msg_id_full)

    # Parse all fields from Body
    fields = _parse_body(root)

    # Enrich from DB parameters
    fields = _enrich_from_db(fields, msg_type_short)

    # Extract primary reference
    reference = (
        sender_ref
        or _find_field_value(fields, 'MsgId')
        or _find_field_value(fields, 'BizMsgIdr')
        or ''
    )

    return {
        'message_type': msg_type_short,
        'message_type_full': msg_id_full,
        'message_type_description': MX_DESCRIPTIONS.get(msg_type_short, ''),
        'sender_bic': sender_bic,
        'receiver_bic': receiver_bic,
        'reference': reference,
        'blocks': {},
        'fields': fields,
    }


def _empty_result(error=''):
    """Return an empty result dict."""
    return {
        'message_type': 'UNKNOWN',
        'message_type_full': '',
        'message_type_description': '',
        'sender_bic': '',
        'receiver_bic': '',
        'reference': '',
        'blocks': {},
        'fields': [{'tag': 'Error', 'qualifier': '', 'raw': '', 'value': error,
                     'display': error, 'sequence': '', 'field_name': 'Error',
                     'description': 'Failed to parse message'}],
    }


def _enrich_from_db(fields, msg_type_short):
    """Enrich field labels from SwiftParameter DB for better accuracy."""
    try:
        from apps.transformation.models import SwiftParameter
        # Load all MX params for this message type
        db_params = {}
        for p in SwiftParameter.objects.filter(category='MX', message_type=msg_type_short):
            db_params[p.field_tag] = (p.field_name, p.description)

        for field in fields:
            tag = field.get('tag', '')
            xpath = field.get('xpath', '')

            # Try exact tag match first
            if tag in db_params and not field.get('field_name'):
                field['field_name'] = db_params[tag][0]
                field['description'] = db_params[tag][1]

            # Try xpath-based match (e.g. "Dbtr/Nm", "PmtId/UETR")
            if not field.get('field_name'):
                for db_tag, (name, desc) in db_params.items():
                    if '/' in db_tag and xpath.endswith(db_tag):
                        field['field_name'] = name
                        field['description'] = desc
                        break
    except Exception:
        pass  # DB not available, use hardcoded labels

    return fields


def _clean_xml_text(text):
    """Fix common PDF extraction artifacts in XML."""
    text = text.strip()
    # Fix broken spaces in values: "utf -8" -> "utf-8", "2025 -11-19" -> "2025-11-19"
    text = re.sub(r'(\w) -(\w)', r'\1-\2', text)
    # Fix broken spaces in UUIDs: "6e92e815 -2eec" -> "6e92e815-2eec"
    text = re.sub(r'([0-9a-f]{4,}) -([0-9a-f]{4})', r'\1-\2', text)
    return text


def _extract_header(root):
    """Extract sender/receiver BIC, message type, and sender reference."""
    sender_bic = ''
    receiver_bic = ''
    msg_id = ''
    sender_ref = ''

    # Build parent map for efficient parent lookup
    parent_map = {c: p for p in root.iter() for c in p}

    # Walk all elements
    for elem in root.iter():
        tag = _local_tag(elem)
        text = (elem.text or '').strip()

        if tag == 'SenderReference' and text:
            sender_ref = text
        elif tag == 'MessageIdentifier' and text:
            msg_id = text
        elif tag == 'MsgDefIdr' and text and not msg_id:
            msg_id = text
        elif tag == 'X1' and text:
            # Determine if Sender or Receiver by walking parents
            p = parent_map.get(elem)
            while p is not None:
                pt = _local_tag(p)
                if pt == 'Sender':
                    sender_bic = text
                    break
                elif pt == 'Receiver':
                    receiver_bic = text
                    break
                p = parent_map.get(p)
        elif tag == 'BICFI' and text:
            # From AppHdr Fr/To
            p = parent_map.get(elem)
            while p is not None:
                pt = _local_tag(p)
                if pt == 'Fr' and not sender_bic:
                    sender_bic = text
                    break
                elif pt == 'To' and not receiver_bic:
                    receiver_bic = text
                    break
                # Stop at Body level
                if pt in ('Body', 'DataPDU', 'Document'):
                    break
                p = parent_map.get(p)

    return sender_bic, receiver_bic, msg_id, sender_ref


def _parse_body(root):
    """
    Parse the Body element into a flat list of field dicts.
    Walks the XML tree and extracts leaf values with their XPath context.
    """
    fields = []

    # Find the Body element
    body = None
    for elem in root.iter():
        if _local_tag(elem) == 'Body':
            body = elem
            break

    if body is None:
        body = root

    # Walk all elements under Body
    _walk_element(body, '', fields, depth=0)

    return fields


def _walk_element(element, path_prefix, fields, depth=0):
    """Recursively walk XML tree, extracting leaf values."""
    for child in element:
        tag = _local_tag(child)
        current_path = f'{path_prefix}/{tag}' if path_prefix else tag

        children = list(child)
        if len(children) == 0:
            # Leaf node — extract value
            value = (child.text or '').strip()
            if not value:
                continue

            # Check for attributes (e.g. Ccy on amounts)
            display = _format_mx_value(tag, value, child.attrib)

            # Get field label
            label = FIELD_LABELS.get(tag, ('', ''))

            # Determine section from path
            section = _path_to_section(current_path)

            fields.append({
                'tag': tag,
                'qualifier': '',
                'raw': f'<{tag}>{value}</{tag}>',
                'value': value,
                'display': display,
                'sequence': section,
                'field_name': label[0],
                'description': label[1],
                'xpath': current_path,
            })
        else:
            # Non-leaf — recurse
            _walk_element(child, current_path, fields, depth + 1)


def _format_mx_value(tag, value, attribs):
    """Format an MX field value for display."""
    # Currency + amount formatting
    if 'Ccy' in attribs:
        ccy = attribs['Ccy']
        try:
            amt = float(value.replace(',', '.'))
            return f'{ccy} {amt:,.2f}'
        except ValueError:
            return f'{ccy} {value}'

    # Date formatting: YYYY-MM-DD already readable
    # DateTime: trim timezone noise
    if tag in ('CreDtTm', 'CreDt', 'DtTm') and 'T' in value:
        return value.replace('T', ' ')[:19]

    return value


def _path_to_section(xpath):
    """Convert an XPath to a human-readable section name."""
    parts = xpath.split('/')
    section_map = {
        # Common
        'AppHdr': 'Application Header',
        'GrpHdr': 'Group Header',
        'SttlmInf': 'Settlement Info',

        # pacs.008 / pacs.009
        'CdtTrfTxInf': 'Credit Transfer',
        'PmtId': 'Payment ID',
        'InstgAgt': 'Instructing Agent',
        'InstdAgt': 'Instructed Agent',
        'Dbtr': 'Debtor',
        'DbtrAcct': 'Debtor Account',
        'DbtrAgt': 'Debtor Agent',
        'CdtrAgt': 'Creditor Agent',
        'Cdtr': 'Creditor',
        'CdtrAcct': 'Creditor Account',
        'IntrmyAgt1': 'Intermediary Agent 1',
        'IntrmyAgt2': 'Intermediary Agent 2',
        'RmtInf': 'Remittance Info',
        'ChrgsInf': 'Charges Info',
        'UltmtDbtr': 'Ultimate Debtor',
        'UltmtCdtr': 'Ultimate Creditor',

        # pacs.002 Status
        'OrgnlGrpInfAndSts': 'Original Group Status',
        'TxInfAndSts': 'Transaction Status',
        'StsRsnInf': 'Status Reason',
        'OrgnlTxRef': 'Original Transaction Ref',

        # pacs.004 Return
        'TxInf': 'Transaction Info',
        'RtrRsnInf': 'Return Reason',
        'OrgnlTxRef': 'Original Transaction',

        # camt.053/054 Statement
        'Stmt': 'Statement',
        'Rpt': 'Report',
        'Ntfctn': 'Notification',
        'Bal': 'Balance',
        'Ntry': 'Entry',
        'NtryDtls': 'Entry Details',
        'TxDtls': 'Transaction Details',
        'Btch': 'Batch',
        'Refs': 'References',
        'BkTxCd': 'Bank Transaction Code',

        # camt.056 / camt.029
        'Undrlyg': 'Underlying',
        'TxInfAndSts': 'Transaction Status',
        'CxlDtls': 'Cancellation Details',
        'OrgnlPmtInfAndCxl': 'Original Payment Cancel',

        # Securities (sese/semt)
        'TradDtls': 'Trade Details',
        'FinInstrmId': 'Financial Instrument',
        'SttlmPties': 'Settlement Parties',
        'DlvrngSttlmPties': 'Delivering Parties',
        'RcvgSttlmPties': 'Receiving Parties',
        'QtyAndAcctDtls': 'Quantity & Account',
        'SttlmParams': 'Settlement Parameters',
        'SfkpgPlc': 'Safekeeping Place',
        'DealPric': 'Deal Price',

        # Corporate Actions (seev)
        'CorpActnGnlInf': 'CA General Info',
        'CorpActnDtls': 'CA Details',
        'CorpActnOptnDtls': 'CA Options',
        'SctiesQty': 'Securities Qty',
    }
    for part in reversed(parts[:-1]):
        if part in section_map:
            return section_map[part]
    return ''


def _short_mx_type(full_id):
    """Convert 'pacs.008.001.08' → 'pacs.008'"""
    if not full_id:
        return 'UNKNOWN'
    parts = full_id.split('.')
    if len(parts) >= 2:
        return f'{parts[0]}.{parts[1]}'
    return full_id


def _find_field_value(fields, tag_name):
    """Find the first field value matching a tag name."""
    for f in fields:
        if f['tag'] == tag_name:
            return f['value']
    return ''


def _local_tag(elem):
    """Strip namespace from element tag."""
    if elem is None:
        return ''
    tag = elem.tag
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag


def is_mx_message(text):
    """Quick check if text content looks like a SWIFT MX (ISO 20022 XML) message."""
    return bool(
        re.search(r'<DataPDU', text)
        or re.search(r'xmlns.*iso.*20022', text)
        or re.search(r'<Document.*(?:pacs|camt|pain|sese|semt|seev)\.\d+', text)
    )
