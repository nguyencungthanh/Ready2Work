"""Reproducible interview-only overlay from the reviewed five-tab snapshot."""
import copy
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = '20261019'
PENDING = {'business-analyst', 'ke-toan-vien', 'tro-ly-thue', 'credit-analyst',
           'financial-analyst', 'logistics-ops', 'supply-chain', 'purchasing'}
REVISED = PENDING | {'kiem-toan-vien'}  # One already-open set has an updated criterion.


def normalize(value):
    return re.sub(r'\s+', ' ', value).strip()


def cell_text(cell):
    return '\n'.join(p['text'].strip() for p in cell if p['text'].strip())


def criterion(text, index, marketing=False):
    pattern = r'\((\d+(?:[.,]\d+)?)\)' if marketing else r'\((\d+(?:[.,]\d+)?)\s*(?:điểm|đ|d)\)'
    match = re.search(pattern, text, re.I)
    if not match:
        raise ValueError(f'Missing explicit criterion points: {text}')
    points = float(match[1].replace(',', '.'))
    if points <= 0:
        raise ValueError('Criterion maximum must be positive')
    name = re.sub(r'^[\s•–-]*Tiêu chí\s*\d+\s*[-–:]?\s*', '', text, flags=re.I)
    name = re.sub(pattern, '', name, count=1).strip(' -–:')
    name = name.split(':')[0].strip()[:200]
    return {'id': f'criterion_{index}', 'name': name, 'maxScore': points,
            'description': text.strip(), 'skill': name}


def parsed_questions(slug, data):
    questions = []
    marketing = data['position_id'].startswith('MKT-')
    for table_number, table in enumerate(data['tables']):
        for row_number, row in enumerate(table['rows'][1:], 1):
            if marketing and table_number == 0:
                column = int(data['position_id'].split('-')[1])
                prompt = re.sub(r'\s*·\s*\d+đ.*$', '', cell_text(row[0]))
                maximum = int(re.search(r'·\s*(\d+)đ', cell_text(row[0]))[1])
                text = cell_text(row[column])
                ends = list(re.finditer(r'\(\d+\)', text))
                parts = []
                start = 0
                for match in ends:
                    parts.append(text[start:match.end()].strip(' \n-•'))
                    start = match.end()
                if text[start:].strip() or len(parts) != 3:
                    raise ValueError(f'{slug}: shared Marketing rubric must have three explicit parts')
                rn, qn = 1, row_number
            elif marketing:
                match = re.match(r'V([23])-(\d+)\.\s*(.*)', cell_text(row[0]), re.S)
                if not match:
                    raise ValueError('Invalid specialist Marketing question')
                rn, qn, prompt = int(match[1]), int(match[2]), match[3]
                maximum = int(cell_text(row[1]))
                parts = [cell_text(c) for c in row[2:]]
            else:
                rn, qn = table_number + 1, row_number
                prompt, maximum, description = map(cell_text, row)
                maximum = int(maximum)
                matches = list(re.finditer(r'(?:[-•]\s*)?Tiêu chí\s*\d+', description, re.I))
                if not matches or description[:matches[0].start()].strip(' -•\n'):
                    raise ValueError(f'{slug}/{rn}/{qn}: unexpected rubric preface')
                parts = [description[m.start():matches[i+1].start() if i+1 < len(matches) else len(description)].strip()
                         for i, m in enumerate(matches)]
            prompt = re.sub(r'^\s*\d+\.\s*', '', prompt).strip()
            if not prompt or not 0 < maximum <= 100:
                raise ValueError(f'{slug}/{rn}/{qn}: empty question or invalid maximum')
            cs = [criterion(part, i, marketing) for i, part in enumerate(parts, 1)]
            questions.append({'round': rn, 'questionNumber': qn, 'questionText': prompt,
                              'sourceMaxScore': maximum, 'maxScore': maximum, 'scoringCriteria': cs,
                              'source_location': {'tab_id': data['tab_id'], 'table_index': table['table_index'],
                                                  'row_index': row_number, 'column_index': column if marketing and table_number == 0 else 0}})
    if [(q['round'], q['questionNumber']) for q in questions] != [(r, n) for r, count in [(1, 3), (2, 3), (3, 2)] for n in range(1, count+1)]:
        raise ValueError(f'{slug}: missing or unordered source rounds/questions')
    return questions


def refresh_interviews(baseline):
    snapshot = json.loads((ROOT/'data/source/interviews-20261019.json').read_text())
    adjustments = json.loads((ROOT/'data/source/interview-adjustments-20261019.json').read_text())
    result = copy.deepcopy(baseline)
    changed = []
    for slug, data in snapshot['sets'].items():
        parsed = parsed_questions(slug, data)
        original = baseline[slug]
        old_questions = [q for r in original['rounds'].values() for q in r['questions']]
        # Ignore markup/whitespace differences when deciding whether a stable,
        # already-open set needs new IDs. Never rewrite its existing sessions.
        signature = lambda q: (normalize(q['questionText']), q['maxScore'],
                               [(normalize(c['description']).lstrip('-• '), c['maxScore']) for c in q['scoringCriteria']])
        differs = [signature(q) for q in old_questions] != [signature(q) for q in parsed]
        if not differs and slug not in PENDING:
            continue
        changed.append(slug)
        item = copy.deepcopy(original)
        item.update(contentVersion=VERSION, source_snapshot='source/interviews-20261019.json',
                    grading_ready=True, source_conflicts=[], source_content_issues=[], source_normalizations=[])
        for r in item['rounds'].values():
            r['questions'] = []
        for q in parsed:
            rn, qn = q['round'], q['questionNumber']
            total = sum(c['maxScore'] for c in q['scoringCriteria'])
            if total != q['maxScore']:
                approved = [a for a in adjustments['normalizations'] if (a['set'], a['round'], a['question'], a['question_maximum'], a['criterion_total']) == (slug, rn, qn, q['maxScore'], total)]
                if len(approved) != 1:
                    raise ValueError(f'{slug}/{rn}/{qn}: unreviewed score conflict {total}/{q["maxScore"]}')
                q['scoreNormalization'] = approved[0]['policy']
                q['sourceCriteriaTotal'] = total
                item['source_normalizations'].append(approved[0])
            q.update(id=f'{data["position_id"]}-V{VERSION}-R{rn}-Q{qn}', positionId=slug,
                     referenceAnswer='\n'.join(c['description'] for c in q['scoringCriteria']),
                     skills=[c['skill'] for c in q['scoringCriteria']], answerType='both')
            item['rounds'][str(rn)]['questions'].append(q)
        item['skills'] = list(dict.fromkeys(c['skill'] for q in parsed for c in q['scoringCriteria']))
        for round in item['rounds'].values():
            if sum(q['maxScore'] for q in round['questions']) != 100:
                raise ValueError(f'{slug}: source round total must be 100')
        result[slug] = item
    if set(changed) != REVISED:
        raise ValueError(f'Unexpected changed interview sets; review source before continuing: {changed}')
    if len(result) != 15 or sum(len(r['questions']) for s in result.values() for r in s['rounds'].values()) != 120:
        raise ValueError('Incomplete interview source')
    return result
