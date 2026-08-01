content = open('d:/SMART REPORTING SYSTEM/backend/inspections/views.py', encoding='utf-8').read()

# submit_to_admin
idx = content.find('def submit_to_admin')
print('=== submit_to_admin ===')
print(content[idx:idx+2500])

# SubmissionViewSet.perform_create
idx2 = content.find('class SubmissionViewSet')
print('\n=== SubmissionViewSet ===')
print(content[idx2:idx2+800])

# SubmissionSerializer.validate
idx3 = content.find('class SubmissionSerializer')
sfile = open('d:/SMART REPORTING SYSTEM/backend/inspections/serializers.py', encoding='utf-8').read()
idx3 = sfile.find('class SubmissionSerializer')
print('\n=== SubmissionSerializer ===')
print(sfile[idx3:idx3+2000])

open('d:/SMART REPORTING SYSTEM/extract.txt', 'w', encoding='utf-8').write(
    content[content.find('def submit_to_admin'):content.find('def submit_to_admin')+2500]
    + '\n\n' +
    content[content.find('class SubmissionViewSet'):content.find('class SubmissionViewSet')+800]
    + '\n\n' +
    sfile[sfile.find('class SubmissionSerializer'):sfile.find('class SubmissionSerializer')+2000]
)
print('Written to extract.txt')
