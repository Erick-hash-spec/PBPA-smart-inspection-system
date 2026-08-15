content = open('d:/SMART REPORTING SYSTEM/backend/inspections/views.py', encoding='utf-8').read()

OLD = (
    "        review_queue_actions = {'list', 'recent', 'approve', 'reject'}\n"
    "        if profile.role in ('supervisor', 'admin') and self.action in review_queue_actions:\n"
    "            queryset = queryset.filter(status='submitted')\n"
    "        elif profile.role == 'admin':\n"
    "            queryset = queryset\n"
    "        elif profile.role == 'supervisor' and self.action in {'retrieve', 'generate_document'}:\n"
    "            queryset = queryset.filter(Q(status='submitted') | Q(supervisor=user))\n"
    "        else:\n"
    "            queryset = owned_queryset(queryset, user, 'inspector')"
)

NEW = (
    "        if profile.role == 'admin':\n"
    "            # Admin sees all inspections always (list, retrieve, detail, etc.)\n"
    "            pass\n"
    "        elif profile.role == 'supervisor':\n"
    "            # Supervisor sees submitted for list/review; own approved + submitted for detail\n"
    "            if self.action in {'list', 'recent', 'approve', 'reject'}:\n"
    "                queryset = queryset.filter(status='submitted')\n"
    "            elif self.action in {'retrieve', 'generate_document'}:\n"
    "                queryset = queryset.filter(Q(status='submitted') | Q(supervisor=user))\n"
    "            else:\n"
    "                queryset = owned_queryset(queryset, user, 'inspector')\n"
    "        else:\n"
    "            queryset = owned_queryset(queryset, user, 'inspector')"
)

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    open('d:/SMART REPORTING SYSTEM/backend/inspections/views.py', 'w', encoding='utf-8').write(content)
    print('PATCHED OK')
else:
    print('NOT FOUND')
    idx = content.find("review_queue_actions")
    if idx >= 0:
        print(repr(content[idx:idx+500]))
