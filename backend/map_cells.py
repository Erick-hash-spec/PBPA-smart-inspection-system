from docx import Document

doc = Document('SHORE TANK CALCULATIONS.docx')
t1 = doc.tables[1]

print('Table 1: mapping unique cells per row')
print('='*70)
for ri, row in enumerate(t1.rows):
    seen = {}
    unique_positions = []
    for ci, cell in enumerate(row.cells):
        cid = id(cell._tc)
        if cid not in seen:
            seen[cid] = ci
            unique_positions.append((ci, cell.text[:25]))
    print(f'Row {ri:2d} ({len(unique_positions)} unique): {unique_positions}')
