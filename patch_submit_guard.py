content = open('d:/SMART REPORTING SYSTEM/backend/inspections/views.py', encoding='utf-8').read()

OLD = (
    "        if obj.signing_step != 'verified':\n"
    "            return Response({'detail': f'Cannot submit: current step is \"{obj.signing_step}\".'}, status=status.HTTP_400_BAD_REQUEST)\n"
)

NEW = (
    "        if obj.signing_step != 'verified':\n"
    "            return Response({'detail': f'Cannot submit: current step is \"{obj.signing_step}\".'}, status=status.HTTP_400_BAD_REQUEST)\n"
    "        if not getattr(obj, 'inspector_signed_at', None):\n"
    "            return Response({'detail': 'Document must be signed by the inspector before submitting to admin.'}, status=status.HTTP_400_BAD_REQUEST)\n"
    "        if not getattr(obj, 'client_signed_at', None):\n"
    "            return Response({'detail': 'Document must be signed by the terminal representative (client) before submitting to admin.'}, status=status.HTTP_400_BAD_REQUEST)\n"
)

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    open('d:/SMART REPORTING SYSTEM/backend/inspections/views.py', 'w', encoding='utf-8').write(content)
    print('PATCHED: dual-signature guard added to submit_to_admin')
else:
    print('NOT FOUND')
    idx = content.find("signing_step != 'verified'")
    print(repr(content[max(0,idx-50):idx+200]))
