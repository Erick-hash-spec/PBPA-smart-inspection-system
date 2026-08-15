from docx import Document
doc = Document('SHORE TANK CALCULATIONS.docx')
t1 = doc.tables[1]
print('Table 1 col count:', len(t1.columns))
print('Row 0 cells text:', [c.text[:15] for c in t1.rows[0].cells])
print('Row 1 cells text:', [c.text[:20] for c in t1.rows[1].cells])
r0 = t1.rows[0]
unique = len(set(id(c._tc) for c in r0.cells))
print('Row 0 unique cell elements:', unique, 'out of', len(r0.cells))
# Check row 9 (VCF)
r9 = t1.rows[9]
print('Row 9 (VCF) cells:', [c.text[:15] for c in r9.cells])
print('Row 9 unique cells:', len(set(id(c._tc) for c in r9.cells)))
