content = open('d:/SMART REPORTING SYSTEM/backend/inspections/serializers.py', encoding='utf-8').read()

# Documents that use the signing workflow — must have both inspector + client signatures
SIGNED_DOC_TYPES = {'dip_ticket', 'seal_isolation', 'product_receipt', 'shore_tank', 'sampling_form'}

# The current validate method ends with:
OLD = (
    "        existing = Submission.objects.filter(doc_type=doc_type, doc_id=doc_id)\n"
    "        if self.instance:\n"
    "            existing = existing.exclude(pk=self.instance.pk)\n"
    "        if existing.exists():\n"
    "            raise serializers.ValidationError({\n"
    "                'detail': f\"{config['label']} has already been submitted.\"\n"
    "            })\n"
    "\n"
    "        return data"
)

NEW = (
    "        existing = Submission.objects.filter(doc_type=doc_type, doc_id=doc_id)\n"
    "        if self.instance:\n"
    "            existing = existing.exclude(pk=self.instance.pk)\n"
    "        if existing.exists():\n"
    "            raise serializers.ValidationError({\n"
    "                'detail': f\"{config['label']} has already been submitted.\"\n"
    "            })\n"
    "\n"
    "        # Enforce dual-signature requirement for signing-workflow documents\n"
    "        SIGNING_WORKFLOW_TYPES = {'dip_ticket', 'seal_isolation', 'product_receipt', 'shore_tank', 'sampling_form'}\n"
    "        if doc_type in SIGNING_WORKFLOW_TYPES:\n"
    "            signing_step = getattr(document, 'signing_step', None)\n"
    "            inspector_signed = getattr(document, 'inspector_signed_at', None)\n"
    "            client_signed = getattr(document, 'client_signed_at', None)\n"
    "            ACCEPTED_STEPS = {'verified', 'submitted'}\n"
    "            if signing_step not in ACCEPTED_STEPS:\n"
    "                raise serializers.ValidationError({\n"
    "                    'detail': (\n"
    "                        f\"{config['label']} must be signed by both the inspector and the \"\n"
    "                        f\"terminal representative (client) before it can be submitted to admin. \"\n"
    "                        f\"Current step: {signing_step or 'draft'}.\"\n"
    "                    )\n"
    "                })\n"
    "            if not inspector_signed:\n"
    "                raise serializers.ValidationError({\n"
    "                    'detail': f\"{config['label']} is missing the inspector signature.\"\n"
    "                })\n"
    "            if not client_signed:\n"
    "                raise serializers.ValidationError({\n"
    "                    'detail': f\"{config['label']} is missing the terminal representative (client) signature.\"\n"
    "                })\n"
    "\n"
    "        return data"
)

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    open('d:/SMART REPORTING SYSTEM/backend/inspections/serializers.py', 'w', encoding='utf-8').write(content)
    print('PATCHED: dual-signature check added to SubmissionSerializer.validate')
else:
    print('NOT FOUND — checking snippet...')
    idx = content.find("existing = Submission.objects.filter(doc_type=doc_type, doc_id=doc_id)")
    print(repr(content[idx:idx+400]))
