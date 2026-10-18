"""Apply the reviewed 19 October simulation source and owner-authorized supplements.

The original 17 October snapshot and published migrations remain immutable.
Used by sync-requirements.py so regenerating source data retains this revision.
"""
import copy
import json
import re
from pathlib import Path

REVISION = '20261019-simulations'
VERSION = '20261019'
SUPPLEMENT_POLICY = 'document_with_authorized_supplements'


def cell_text(paragraphs, numbered=False):
    values = []
    for paragraph in paragraphs:
        text = paragraph['text'].replace('\xa0', ' ').strip()
        if numbered and paragraph.get('list_kind') == 'ol':
            text = f"{paragraph['list_number']}. " + text
        elif paragraph.get('list_kind') == 'ul':
            text = '- ' + text
        if text:
            values.append(text)
    return '\n\n'.join(values)


def rubric_from_source(paragraphs, position_id):
    groups = []
    current = None
    for paragraph in paragraphs:
        line = paragraph['text'].replace('\xa0', ' ').strip()
        heading = re.match(r'^(?:NHIỆM VỤ|TRÌNH BÀY).*?\((\d+)\s*(?:đ|điểm)\)', line, re.I)
        if heading:
            current = {'heading': line, 'points': int(heading[1]), 'body': []}
            groups.append(current)
        elif line and current:
            current['body'].append(line)
    if len(groups) != 4:
        raise ValueError(f'{position_id}: expected three tasks and presentation criterion')
    result = []
    for index, group in enumerate(groups, 1):
        cid = f'C{index}'
        children = []
        for line in group['body']:
            direct = re.search(r'\((\d+)\s*(?:đ|điểm)\)', line, re.I)
            multiplied = re.search(r'\((\d+)\s+[^()]+?[x×]\s*(\d+)\s*đ\)', line, re.I)
            points = int(direct[1]) if direct else int(multiplied[1]) * int(multiplied[2]) if multiplied else None
            if points is not None:
                children.append({'text': line, 'points': points})
            elif children:
                # Continue the parent's guidance instead of losing examples/caps.
                children[-1]['text'] += '\n' + line
        if not children:
            children = [{'text': '\n'.join([group['heading']] + group['body']), 'points': group['points']}]
        if sum(c['points'] for c in children) != group['points']:
            raise ValueError(f'{position_id}/{cid}: source component maximum mismatch')
        result.append({'criterion_id': cid, 'criterion_name': re.split(r'\s*\(\d+\s*(?:đ|điểm)\)', group['heading'], flags=re.I)[0].strip(' :'),
                       'max_points': group['points'], 'source_max_points': group['points'], 'description': '\n'.join([group['heading']] + group['body']),
                       'checklist': [{'checklist_id': f'{position_id}-{cid}-{i}', **child, 'scoring_source': 'ai'} for i, child in enumerate(children, 1)]})
    return result


def apply_simulation_refresh(tasks, root):
    data = root / 'platform/data'
    source = json.loads((data / 'source/simulations-20261019.json').read_text())
    supplements = json.loads((data / 'source/marketing-inputs-20261019.json').read_text())
    adjustments = json.loads((data / 'source/simulation-adjustments-20261019.json').read_text())
    correction = adjustments['adjustments'][0]
    tasks = copy.deepcopy(tasks)
    changed = {'MKT-01', 'MKT-02', 'MKT-03', 'TCNH-01', 'TCNH-02', 'TCNH-03', 'KK-01'}
    for industry in tasks['industries']:
        for task in industry['tasks']:
            pid = task['position_id']
            if pid not in changed:
                continue
            raw = source['tasks'][pid]
            task.update(source_version=VERSION, content_revision=REVISION,
                        source_snapshot='source/simulations-20261019.json',
                        source_location={'tab_id': raw['tab_id'], 'table_index': raw['table_index'], 'row_index': raw.get('row_index')})
            if pid.startswith('TCNH-'):
                task['context'] = cell_text(raw['cells'][1], True)
                task['requirements'] = [cell_text(raw['cells'][2], True)]
                rubric_paragraphs = copy.deepcopy(raw['cells'][3])
                if pid == 'TCNH-01':
                    # Keep the immutable original in the snapshot; apply the owner's
                    # authorized correction to the runtime grading instructions.
                    for p in rubric_paragraphs:
                        p['text'] = p['text'].replace('mỗi giải pháp 6 điểm', f"mỗi giải pháp {correction['approved_points_per_solution']} điểm")
                    task['source_policy'] = SUPPLEMENT_POLICY
                    task['source_adjustments'] = [correction]
                task['rubric'] = rubric_from_source(rubric_paragraphs, pid)
                task['source_rubric_text'] = cell_text(rubric_paragraphs)
                if pid == 'TCNH-01':
                    criterion = task['rubric'][2]
                    criterion['checklist'] = [{'checklist_id': f'{pid}-C3-{number}', 'points': 10, 'scoring_source': 'ai',
                        'text': f'Giải pháp {number}: nhắm đúng nguyên nhân đã phân tích (2đ), hành động cụ thể và khả thi (4đ), thời gian thực hiện (2đ), KPI đo được (2đ). Không cộng điểm chỉ vì liệt kê tên giải pháp.'} for number in [1, 2, 3]]
                    criterion['description'] += '\nMỗi giải pháp 10 điểm: gắn nguyên nhân 2; hành động cụ thể/khả thi 4; thời gian 2; KPI đo được 2.'
                task['source_total_points'] = sum(c['max_points'] for c in task['rubric'])
                if task['source_total_points'] != 100:
                    raise ValueError(f'{pid}: total is not 100')
                task['source_conflicts'] = []
                task['grading_ready'] = True
            elif pid == 'KK-01':
                for c in task['rubric']:
                    c['description'] = c['description'].replace('Ô tô dưới 9 chỗ', 'Ô tô từ 9 chỗ trở xuống')
                    for item in c['checklist']:
                        item['text'] = item['text'].replace('Ô tô dưới 9 chỗ', 'Ô tô từ 9 chỗ trở xuống')
                task['source_rubric_text'] = cell_text(raw['cells'][3])
            else:
                task['source_policy'] = SUPPLEMENT_POLICY
                task['public_materials'] += copy.deepcopy(supplements['by_position'][pid])
                task['input_artifacts'] = [{'artifact_id': pid + '-DATA-01', 'type': 'simulated_source_data', 'description': 'Dữ liệu đầu vào mô phỏng được chủ dự án cho phép bổ sung.', 'required': True}]
                task['supplemental_source'] = 'source/marketing-inputs-20261019.json'
                task.pop('missing_source_inputs', None)
                task['grading_ready'] = True
    tasks['source_version'] = VERSION
    tasks['document_purpose'] = 'Đề và barem theo Docs cập nhật 19/10/2026; dữ liệu còn thiếu và điểm chưa khớp được bổ sung theo ủy quyền của chủ dự án.'
    return tasks
