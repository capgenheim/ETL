"""
SWIFT Message API views — list, detail, download Excel, upload, delete.
"""
import os

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SwiftMessage


class SwiftMessageListView(APIView):
    """
    GET  /api/transformation/swift-messages/       — List processed messages
    POST /api/transformation/swift-messages/upload/ — Manual file upload
    """

    def get(self, request):
        qs = SwiftMessage.objects.all()

        # Filters
        mt = request.query_params.get('message_type')
        if mt:
            qs = qs.filter(message_type__icontains=mt)

        status_filter = request.query_params.get('status')
        if status_filter in ('processed', 'failed'):
            qs = qs.filter(status=status_filter)

        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(message_type__icontains=search) |
                Q(reference__icontains=search) |
                Q(sender_bic__icontains=search) |
                Q(receiver_bic__icontains=search) |
                Q(original_filename__icontains=search)
            )

        data = [
            {
                'id': m.id,
                'message_type': m.message_type,
                'message_type_description': m.message_type_description,
                'sender_bic': m.sender_bic,
                'receiver_bic': m.receiver_bic,
                'reference': m.reference,
                'original_filename': m.original_filename,
                'excel_filename': m.excel_filename,
                'status': m.status,
                'error_message': m.error_message,
                'processed_at': m.processed_at.isoformat() if m.processed_at else None,
                'created_at': m.created_at.isoformat(),
            }
            for m in qs[:200]
        ]
        return Response(data)


class SwiftMessageDetailView(APIView):
    """
    GET    /api/transformation/swift-messages/<id>/         — Detail with parsed JSON
    DELETE /api/transformation/swift-messages/<id>/         — Delete message
    """

    def get(self, request, pk):
        try:
            m = SwiftMessage.objects.get(pk=pk)
        except SwiftMessage.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': m.id,
            'message_type': m.message_type,
            'message_type_description': m.message_type_description,
            'sender_bic': m.sender_bic,
            'receiver_bic': m.receiver_bic,
            'reference': m.reference,
            'raw_content': m.raw_content,
            'parsed_json': m.parsed_json,
            'original_filename': m.original_filename,
            'excel_filename': m.excel_filename,
            'status': m.status,
            'error_message': m.error_message,
            'processed_at': m.processed_at.isoformat() if m.processed_at else None,
            'created_at': m.created_at.isoformat(),
        })

    def delete(self, request, pk):
        try:
            m = SwiftMessage.objects.get(pk=pk)
        except SwiftMessage.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # Also delete the Excel file from sft_outbound
        if m.excel_filename:
            excel_path = os.path.join(settings.SFT_OUTBOUND_DIR, m.excel_filename)
            if os.path.exists(excel_path):
                os.remove(excel_path)

        ref = f'{m.message_type} {m.reference}'
        m.delete()
        return Response({'message': f'Deleted: {ref}'})


class SwiftMessageDownloadView(APIView):
    """
    GET /api/transformation/swift-messages/<id>/download/ — Download Excel
    """

    def get(self, request, pk):
        try:
            m = SwiftMessage.objects.get(pk=pk)
        except SwiftMessage.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if not m.excel_filename:
            return Response({'error': 'No Excel file available'}, status=status.HTTP_404_NOT_FOUND)

        excel_path = os.path.join(settings.SFT_OUTBOUND_DIR, m.excel_filename)
        if not os.path.exists(excel_path):
            # Try to regenerate
            try:
                from .swift_parser import parse_swift_message
                from .swift_excel import generate_excel
                parsed = m.parsed_json or parse_swift_message(m.raw_content)
                excel_path, excel_name = generate_excel(parsed, settings.SFT_OUTBOUND_DIR, m.original_filename)
                m.excel_filename = excel_name
                m.save(update_fields=['excel_filename'])
            except Exception as e:
                return Response({'error': f'Excel generation failed: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        with open(excel_path, 'rb') as f:
            response = HttpResponse(
                f.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = f'attachment; filename="{m.excel_filename}"'
            return response


class SwiftMessageUploadView(APIView):
    """
    POST /api/transformation/swift-messages/upload/ — Manual file upload.
    Accepts .fin, .txt, .xml files.
    Intelligently detects MT (FIN) vs MX (ISO 20022 XML) and routes accordingly.
    """

    def post(self, request):
        files = request.FILES.getlist('file')
        if not files:
            return Response({'error': 'No file(s) provided'}, status=status.HTTP_400_BAD_REQUEST)

        from .swift_parser import is_swift_message, parse_swift_message
        from .mx_parser import is_mx_message, parse_mx_message
        from .swift_excel import generate_excel

        all_results = []

        for file in files:
            content = file.read().decode('utf-8', errors='replace')

            is_mx = is_mx_message(content)
            is_mt = is_swift_message(content)

            if not is_mx and not is_mt:
                all_results.append({'error': f'{file.name}: Not a valid SWIFT message', 'type': 'SKIPPED'})
                continue

            results = []

            if is_mx:
                # ── MX (ISO 20022 XML) processing ────────────────────
                from .tasks import _split_mx_messages, _register_swift_file_log
                mx_messages = _split_mx_messages(content)
                for msg_text in mx_messages:
                    try:
                        parsed = parse_mx_message(msg_text)
                        excel_path, excel_name = generate_excel(
                            parsed, settings.SFT_OUTBOUND_DIR, file.name
                        )
                        msg = SwiftMessage.objects.create(
                            message_type=parsed['message_type'],
                            message_type_description=parsed.get('message_type_description', ''),
                            sender_bic=parsed['sender_bic'],
                            receiver_bic=parsed['receiver_bic'],
                            reference=parsed['reference'],
                            raw_content=msg_text,
                            parsed_json=parsed,
                            original_filename=file.name,
                            excel_filename=excel_name,
                            source_file_content=content.encode('utf-8'),
                            status='processed',
                            processed_at=timezone.now(),
                        )
                        _register_swift_file_log(
                            original_filename=file.name,
                            raw_bytes=content.encode('utf-8'),
                            output_filename=excel_name,
                            msg_type=parsed['message_type'],
                            is_mx=True,
                        )
                        results.append({
                            'id': msg.id,
                            'type': parsed['message_type'],
                            'format': 'MX',
                            'description': parsed.get('message_type_description', ''),
                            'reference': parsed['reference'],
                            'excel': excel_name,
                        })
                    except Exception as e:
                        results.append({'error': str(e), 'type': 'FAILED', 'format': 'MX'})
            else:
                # ── MT (FIN) processing ───────────────────────────────
                from .tasks import _split_swift_messages, _register_swift_file_log
                messages = _split_swift_messages(content)
                for msg_text in messages:
                    try:
                        parsed = parse_swift_message(msg_text)
                        excel_path, excel_name = generate_excel(
                            parsed, settings.SFT_OUTBOUND_DIR, file.name
                        )
                        msg = SwiftMessage.objects.create(
                            message_type=parsed['message_type'],
                            message_type_description=parsed['message_type_description'],
                            sender_bic=parsed['sender_bic'],
                            receiver_bic=parsed['receiver_bic'],
                            reference=parsed['reference'],
                            raw_content=msg_text,
                            parsed_json=parsed,
                            original_filename=file.name,
                            excel_filename=excel_name,
                            source_file_content=content.encode('utf-8'),
                            status='processed',
                            processed_at=timezone.now(),
                        )
                        _register_swift_file_log(
                            original_filename=file.name,
                            raw_bytes=content.encode('utf-8'),
                            output_filename=excel_name,
                            msg_type=parsed['message_type'],
                            is_mx=False,
                        )
                        results.append({
                            'id': msg.id,
                            'type': parsed['message_type'],
                            'format': 'MT',
                            'description': parsed['message_type_description'],
                            'reference': parsed['reference'],
                            'excel': excel_name,
                        })
                    except Exception as e:
                        results.append({'error': str(e), 'type': 'FAILED', 'format': 'MT'})

            all_results.extend(results)

        if not all_results:
            return Response(
                {'error': 'No valid SWIFT messages found in uploaded file(s)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ok_count = len([r for r in all_results if 'id' in r])
        return Response({
            'message': f'Processed {ok_count} message(s) from {len(files)} file(s)',
            'results': all_results,
        }, status=status.HTTP_201_CREATED)

