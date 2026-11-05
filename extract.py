import pypdf
import json
import re

reader = pypdf.PdfReader('05.11.2026.pdf')

section_map = {
    'Top 40 reduceri (toate categoriile)': ('top40', 'Top 40 Reduceri', True),
    'TV-uri (279 produse comparate)': ('tv', 'TV-uri (279 oferte)', False),
    'Tablete (55 produse comparate)': ('tablete', 'Tablete (55 oferte)', False),
    'Telefoane (174 produse comparate)': ('telefoane', 'Telefoane (174 oferte)', False),
    'Electrocasnice (1058 produse comparate)': ('electrocasnice', 'Electrocasnice (1058 oferte)', False),
    'Whisky (112 produse comparate)': ('whisky', 'Whisky (112 oferte)', False),
    'Gin (33 produse comparate)': ('gin', 'Gin (33 oferte)', False),
    'Rom (44 produse comparate)': ('rom', 'Rom (44 oferte)', False),
    'Amaretto (1 produse comparate)': ('amaretto', 'Amaretto (1 ofertă)', False),
}

raw_items_by_section = {k[0]: [] for k in section_map.values()}
current_section = None
has_category_col = False

for page in reader.pages:
    lines = [l.strip() for l in page.extract_text().split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        for sec_header, (sec_id, sec_title, sec_has_cat) in section_map.items():
            if sec_header in line:
                current_section = sec_id
                has_category_col = sec_has_cat
                break
        
        if line in ['#', 'Categorie', 'Produs (din PDF)', 'Preț PDF', 'Preț eMAG', 'Reducere', 'Link eMAG', 'Notă'] or \
           'Reduceri: lista BF Promo' in line or 'Categorii: TV-uri' in line or '(inclusiv vânzători' in line or 'fi alt produs' in line:
            i += 1
            continue
            
        if current_section and line.isdigit():
            item_nr = int(line)
            i += 1
            cat_val = None
            if has_category_col and i < len(lines):
                cat_val = lines[i]
                i += 1
            
            name_parts = []
            while i < len(lines):
                curr = lines[i]
                if re.match(r'^\d{1,3}(\.\d{3})*,\d{2}$', curr) or curr == '—':
                    break
                if curr.isdigit() and len(name_parts) > 0:
                    break
                if curr in ['#', 'Categorie', 'Produs (din PDF)', 'Preț PDF', 'Preț eMAG', 'Reducere', 'Link eMAG', 'Notă']:
                    i += 1
                    continue
                name_parts.append(curr)
                i += 1
            
            prod_name = " ".join(name_parts)
            price_bf = lines[i] if i < len(lines) and re.match(r'^\d{1,3}(\.\d{3})*,\d{2}$', lines[i]) else None
            if price_bf: i += 1
            
            price_emag = lines[i] if i < len(lines) and (re.match(r'^\d{1,3}(\.\d{3})*,\d{2}$', lines[i]) or lines[i] == '—') else None
            if price_emag: i += 1
            
            discount = lines[i] if i < len(lines) and re.match(r'^-?\d+%$', lines[i]) else None
            if discount: i += 1
            
            link_code = None
            note = None
            if i < len(lines) and not lines[i].isdigit() and lines[i] not in ['#', 'Categorie', 'Produs (din PDF)']:
                link_code = lines[i]
                i += 1
                if i < len(lines) and ('verifică potrivirea' in lines[i] or 'diferență mare' in lines[i]):
                    note = lines[i]
                    i += 1
            
            raw_items_by_section[current_section].append({
                'nr': item_nr,
                'cat': cat_val,
                'name': prod_name,
                'price_bf': price_bf,
                'price_emag': price_emag,
                'discount': discount,
                'code': link_code,
                'note': note
            })
        else:
            i += 1

with open('deals_05_11.json', 'w', encoding='utf-8') as f:
    json.dump({'sections': raw_items_by_section}, f, ensure_ascii=False, indent=2)

print("Gata! deals_05_11.json a fost generat.")