"""
SWIFT Package API views — CRUD for SwiftPackage configuration.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SwiftPackage


# All known MT and MX types for the selector
KNOWN_MESSAGE_TYPES = {
    'MT': [
        {'code': 'MT103', 'desc': 'Single Customer Credit Transfer'},
        {'code': 'MT202', 'desc': 'General FI Transfer'},
        {'code': 'MT210', 'desc': 'Notice to Receive'},
        {'code': 'MT300', 'desc': 'Foreign Exchange Confirmation'},
        {'code': 'MT502', 'desc': 'Order to Buy or Sell'},
        {'code': 'MT540', 'desc': 'Receive Free'},
        {'code': 'MT541', 'desc': 'Receive Against Payment'},
        {'code': 'MT542', 'desc': 'Deliver Free'},
        {'code': 'MT543', 'desc': 'Deliver Against Payment'},
        {'code': 'MT544', 'desc': 'Receive Free Confirmation'},
        {'code': 'MT545', 'desc': 'Receive Against Payment Confirmation'},
        {'code': 'MT546', 'desc': 'Deliver Free Confirmation'},
        {'code': 'MT547', 'desc': 'Deliver Against Payment Confirmation'},
        {'code': 'MT565', 'desc': 'Corporate Action Instruction'},
        {'code': 'MT900', 'desc': 'Confirmation of Debit'},
        {'code': 'MT910', 'desc': 'Confirmation of Credit'},
        {'code': 'MT940', 'desc': 'Customer Statement Message'},
        {'code': 'MT950', 'desc': 'Statement Message'},
    ],
    'MX': [
        {'code': 'pacs.002', 'desc': 'Payment Status Report'},
        {'code': 'pacs.004', 'desc': 'Payment Return'},
        {'code': 'pacs.008', 'desc': 'FI to FI Customer Credit Transfer'},
        {'code': 'pacs.009', 'desc': 'FI Credit Transfer'},
        {'code': 'camt.029', 'desc': 'Resolution of Investigation'},
        {'code': 'camt.053', 'desc': 'Bank to Customer Statement'},
        {'code': 'camt.054', 'desc': 'Debit/Credit Notification'},
        {'code': 'camt.056', 'desc': 'Cancellation Request'},
        {'code': 'pain.001', 'desc': 'Customer Credit Transfer Initiation'},
        {'code': 'sese.023', 'desc': 'Securities Settlement Instruction'},
        {'code': 'sese.025', 'desc': 'Securities Settlement Confirmation'},
        {'code': 'seev.031', 'desc': 'Corporate Action Notification'},
        {'code': 'semt.002', 'desc': 'Custody Statement of Holdings'},
    ],
}


def _serialize_package(pkg):
    return {
        'id': pkg.id,
        'name': pkg.name,
        'description': pkg.description,
        'message_types': pkg.message_types,
        'output_format': pkg.output_format,
        'processing_mode': pkg.processing_mode,
        'batch_interval_minutes': pkg.batch_interval_minutes,
        'file_pattern': pkg.file_pattern,
        'status': pkg.status,
        'created_at': pkg.created_at.isoformat(),
        'updated_at': pkg.updated_at.isoformat(),
    }


class SwiftPackageListView(APIView):
    """
    GET  /api/transformation/swift-packages/        — List all packages
    POST /api/transformation/swift-packages/        — Create a package
    """

    def get(self, request):
        packages = SwiftPackage.objects.all()
        data = [_serialize_package(p) for p in packages]
        return Response(data)

    def post(self, request):
        d = request.data
        name = d.get('name', '').strip()
        if not name:
            return Response({'error': 'Package name is required'}, status=status.HTTP_400_BAD_REQUEST)

        if SwiftPackage.objects.filter(name=name).exists():
            return Response({'error': f'Package "{name}" already exists'}, status=status.HTTP_400_BAD_REQUEST)

        msg_types = d.get('message_types', ['ALL'])
        if not msg_types:
            msg_types = ['ALL']

        pkg = SwiftPackage.objects.create(
            name=name,
            description=d.get('description', ''),
            message_types=msg_types,
            output_format=d.get('output_format', 'xlsx'),
            processing_mode=d.get('processing_mode', 'instant'),
            batch_interval_minutes=d.get('batch_interval_minutes', 30),
            file_pattern=d.get('file_pattern', '*.*'),
            status=d.get('status', 'active'),
        )
        return Response(_serialize_package(pkg), status=status.HTTP_201_CREATED)


class SwiftPackageDetailView(APIView):
    """
    GET    /api/transformation/swift-packages/{id}/ — Detail
    PUT    /api/transformation/swift-packages/{id}/ — Update
    DELETE /api/transformation/swift-packages/{id}/ — Delete
    """

    def _get(self, pk):
        try:
            return SwiftPackage.objects.get(pk=pk)
        except SwiftPackage.DoesNotExist:
            return None

    def get(self, request, pk):
        pkg = self._get(pk)
        if not pkg:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_package(pkg))

    def put(self, request, pk):
        pkg = self._get(pk)
        if not pkg:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        d = request.data
        if 'name' in d:
            pkg.name = d['name'].strip()
        if 'description' in d:
            pkg.description = d['description']
        if 'message_types' in d:
            pkg.message_types = d['message_types'] or ['ALL']
        if 'output_format' in d:
            pkg.output_format = d['output_format']
        if 'processing_mode' in d:
            pkg.processing_mode = d['processing_mode']
        if 'batch_interval_minutes' in d:
            pkg.batch_interval_minutes = d['batch_interval_minutes']
        if 'file_pattern' in d:
            pkg.file_pattern = d['file_pattern']
        if 'status' in d:
            pkg.status = d['status']

        pkg.save()
        return Response(_serialize_package(pkg))

    def delete(self, request, pk):
        pkg = self._get(pk)
        if not pkg:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        name = pkg.name
        pkg.delete()
        return Response({'message': f'Package "{name}" deleted'})


class SwiftPackageTypesView(APIView):
    """
    GET /api/transformation/swift-packages/types/ — Available MT/MX types for selector
    """

    def get(self, request):
        return Response(KNOWN_MESSAGE_TYPES)
