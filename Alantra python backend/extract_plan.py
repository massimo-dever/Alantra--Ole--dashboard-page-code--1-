from docx import Document

doc = Document('Python_Backend_Plan.docx')

full_text = []

for para in doc.paragraphs:

    full_text.append(para.text)

print('\n'.join(full_text))