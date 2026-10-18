import shutil
import json,re,copy
from pathlib import Path
root=Path(__file__).resolve().parents[2]
source=json.loads((root/'platform/data/source/requirements-20261017.json').read_text())
blocks={b['index']:b for b in source['blocks']}
text=lambda cell:'\n'.join(p['text'].strip() for p in cell if p['text'].strip())
rows=lambda i:[[text(c) for c in r] for r in blocks[i]['rows']]
clean=lambda s:re.sub(r'^[\s•–-]+','',s).strip()
def policy(level,industry):return ('core' if level=='M1' else 'common' if level=='M2' else 'advantage' if level=='M4' or industry=='MKT' else 'conditional')
industries=[('MKT','Marketing',[('01','Marketing Intern (Thực tập sinh Marketing)',271),('02','Digital Marketing Executive (Chuyên viên Marketing Số)',273),('03','Content Marketing Specialist (Chuyên viên Sáng tạo Nội dung)',275)]),('IT','Công nghệ thông tin',[('01','Business Analyst',329),('02','Software Tester / QA',338),('03','Data Analyst',347)]),('KK','Kế toán - Kiểm toán',[('01','Kế toán viên',388),('02','Kiểm toán viên',390),('03','Trợ lý thuế',392)]),('TCNH','Tài chính - Ngân hàng',[('01','Financial Analyst (Chuyên viên Phân tích Tài chính)',437),('02','Credit Analyst (Chuyên viên Thẩm định Tín dụng)',435),('03','Risk Analyst (Chuyên viên Phân tích Rủi ro tín dụng)',439)]),('LOG','Logistics',[('01','Logistics Operations Executive (Chuyên viên Vận hành Logistics)',481),('02','Supply Chain Analyst (Chuyên viên Phân tích Chuỗi cung ứng)',484),('03','Purchasing Executive (Chuyên viên Thu mua)',487)])]
profiles={'schema_version':'2.0','project':'Ready2Work','document_purpose':'Golden Profile theo nguyên bản tài liệu yêu cầu được cung cấp ngày 17/10/2026.','source_url':source['source_url'],'fields_legend':{'required_level_scale':['M1','M2','M3','M4'],'policy':'Marketing: M1 cốt lõi, M2 quan trọng, M3 lợi thế. Các ngành còn lại: M1 cốt lõi, M2 phổ biến, M3 chỉ khi JD yêu cầu, M4 lợi thế. Không suy ra trọng số số học từ mức độ.'},'scoring_guideline':{'method':'Đối chiếu từng tiêu chí và mức độ theo nguồn; nguồn không cung cấp trọng số số học. Không biến nội dung chưa thể hiện trên CV thành kết luận ứng viên không có kỹ năng.'},'industries':[]}
for iid,iname,positions in industries:
 out={'industry_id':iid,'industry_name':iname,'positions':[]}
 for suffix,name,bi in positions:
  p={'position_id':iid+'-'+suffix,'position_name':name,'source_block':bi,'hard_skills':[],'soft_skills':[],'tools':[],'certifications':[]}
  if iid=='IT':
   for cat,tab in [('hard_skills',bi),('soft_skills',bi+2),('tools',bi+4)]:
    for code,label,desc,level in rows(tab)[1:]:
     field='tool' if cat=='tools' else 'skill'
     p[cat].append({field:label,'source_code':code,'description':desc,'required_level':level,'source_requirement_policy':policy(level,iid),'keywords':[label.lower()]})
   for label,note in rows(bi+6)[1:]:
    level='M4' if 'M4' in label+' '+note else 'M3' if 'JD đòi hỏi' in note else 'M4'
    p['certifications'].append({'name':label,'description':note,**({'required_level':level} if 'M4' in label+' '+note else {}),'source_requirement_policy':('conditional' if 'JD đòi hỏi' in note else 'advantage'),'keywords':[label.lower()]})
  else:
   for row in rows(bi)[1:]:
    level=re.search(r'M[1-4]',row[0]).group()
    for cat,value in zip(['hard_skills','soft_skills','tools'],row[1:]):
     for line in value.splitlines():
      line=clean(line)
      if not line or line in ['–','-']:continue
      code=re.match(r'^([HST]\d+)\s+',line)
      label=line[code.end():] if code else line
      item={('tool' if cat=='tools' else 'skill'):label,'required_level':level,'source_requirement_policy':policy(level,iid),'keywords':[label.lower()]}
      if code:item['source_code']=code[1]
      p[cat].append(item)
  out['positions'].append(p)
 profiles['industries'].append(out)
# Read exact question and criterion text from table cells. No generated reference answers.
mapsets=[('business-analyst','Business Analyst','IT-01',359,361,363),('qa-tester','Software Tester/QA','IT-02',366,368,370),('data-analyst','Data Analyst','IT-03',373,375,377),('ke-toan-vien','Kế toán viên','KK-01',405,407,409),('kiem-toan-vien','Kiểm toán viên','KK-02',413,415,417),('tro-ly-thue','Trợ lý thuế','KK-03',420,422,424),('credit-analyst','Credit Analyst','TCNH-02',446,448,452),('financial-analyst','Financial Analyst','TCNH-01',457,459,462),('risk-analyst','Risk Analyst','TCNH-03',465,467,470),('logistics-ops','Logistics Operations Executive','LOG-01',496,498,500),('supply-chain','Supply Chain Analyst','LOG-02',504,506,508),('purchasing','Purchasing Executive','LOG-03',511,513,516)]
bank={};issues=[]
iname={i[0]:i[1] for i in industries}
def criterion(s,ci,slug,rn,qn):
 pts=re.search(r'\((\d+(?:[.,]\d+)?)\s*(?:đ|điểm)\)',s,re.I)
 if not pts:pts=re.search(r'\b(\d+)\s*đ\b',s,re.I)
 value=float(pts[1].replace(',','.')) if pts else None
 label=re.sub(r'^[-•\s]*Tiêu chí\s*\d+\s*[-–:]?\s*','',s,flags=re.I)
 label=re.sub(r'\([^)]*(?:đ|điểm)[^)]*\)','',label,flags=re.I).strip(' -–:')
 label=label.split(':')[0].strip()[:200]
 if not label:label='Tiêu chí '+str(ci)
 if value is None:issues.append({'kind':'missing_criterion_points','set':slug,'round':rn,'question':qn,'criterion':ci,'text':s})
 return {'id':'criterion_'+str(ci),'name':label,'maxScore':value,'description':s.strip(),'skill':label}
def question(slug,pid,rn,qn,prompt,maximum,criteria,bi):
 actual=sum(c['maxScore'] or 0 for c in criteria)
 if actual!=maximum:issues.append({'kind':'question_maximum_conflict','set':slug,'round':rn,'question':qn,'sourceMaximum':maximum,'criterionTotal':actual})
 return {'id':f'{pid}-V20261017-R{rn}-Q{qn}','positionId':slug,'round':rn,'questionNumber':qn,'questionText':re.sub(r'^\d+\.\s*','',prompt).strip(),'sourceMaxScore':maximum,'maxScore':maximum,'scoringCriteria':criteria,'referenceAnswer':'\n'.join(c['description'] for c in criteria),'skills':[c['skill'] for c in criteria],'answerType':'both','source_block':bi}
def setmeta(slug,title,pid):
 return {'positionId':slug,'goldenProfileId':pid,'positionTitle':title,'industryId':pid.split('-')[0],'industryName':iname[pid.split('-')[0]],'contentVersion':'20261017','skills':[],'rounds':{str(i):{'roundNumber':i,'title':f'Vòng {i}: '+['Câu hỏi tổng quan','Câu hỏi chuyên môn','Câu hỏi tình huống'][i-1],'type':['general','technical','situational'][i-1],'duration':[15,20,10][i-1],'questions':[]} for i in [1,2,3]}}
for slug,title,pid,*tabs in mapsets:
 s=setmeta(slug,title,pid)
 for rn,bi in enumerate(tabs,1):
  for qn,(prompt,maximum,desc) in enumerate(rows(bi)[1:],1):
   parts=[x.strip() for x in re.split(r'(?=(?:[-•]\s*)?Tiêu chí\s*\d)',desc) if x.strip(' -•\n')]
   # Avoid a double split before a hyphen and the same criterion token.
   parts=[x for x in parts if re.search(r'Tiêu chí\s*\d',x)]
   cs=[criterion(x,ci,slug,rn,qn) for ci,x in enumerate(parts,1)]
   s['rounds'][str(rn)]['questions'].append(question(slug,pid,rn,qn,prompt,int(maximum),cs,bi))
 s['skills']=list(dict.fromkeys(c['skill'] for r in s['rounds'].values() for q in r['questions'] for c in q['scoringCriteria']))
 bank[slug]=s
# Marketing round one is a position matrix; rounds two/three are five-column tables.
for col,(slug,title,pid,bi) in enumerate([('marketing-intern','Marketing Intern','MKT-01',308),('digital-marketing','Digital Marketing Executive','MKT-02',311),('content-marketing','Content Marketing Specialist','MKT-03',314)],1):
 s=setmeta(slug,title,pid)
 for qn,row in enumerate(rows(304)[1:],1):
  prompt=re.sub(r'\s*·\s*\d+đ.*$','',row[0]);maximum=[30,35,35][qn-1]
  pts=[12,10,8] if qn==1 else ([12,15,8] if col==1 else [15,12,8]) if qn==2 else ([15,12,8] if col==1 else [12,15,8])
  parts=[clean(p['text']) for p in blocks[304]['rows'][qn][col] if clean(p['text'])]
  if len(parts)==1:parts=re.split(r'(?<=\))\s+-\s+',parts[0])
  if len(parts)!=3:raise ValueError(('marketing criteria count',col,qn,parts))
  cs=[]
  for ci,(part,score) in enumerate(zip(parts,pts),1):
   label=re.sub(r'\s*\(\d+\)\s*$','',part).strip()
   cs.append({'id':'criterion_'+str(ci),'name':label[:200],'maxScore':score,'description':part,'skill':label[:200]})
  s['rounds']['1']['questions'].append(question(slug,pid,1,qn,prompt,maximum,cs,304))
 for row in rows(bi)[1:]:
  prompt,maximum,*desc=row;m=re.match(r'V([23])-(\d+)\.\s*(.*)',prompt,re.S)
  if not m:raise ValueError(prompt)
  rn,qn=int(m[1]),int(m[2]);cs=[]
  for ci,part in enumerate(desc,1):
   score=int(re.search(r'\((\d+)\)',part)[1]);label=re.sub(r'^\(\d+\)\s*','',part).strip()
   cs.append({'id':'criterion_'+str(ci),'name':label[:200],'maxScore':score,'description':part,'skill':label[:200]})
  s['rounds'][str(rn)]['questions'].append(question(slug,pid,rn,qn,m[3],int(maximum),cs,bi))
 s['skills']=list(dict.fromkeys(c['skill'] for r in s['rounds'].values() for q in r['questions'] for c in q['scoringCriteria']))
 bank[slug]=s
import tempfile
out=Path(tempfile.mkdtemp(prefix='r2w-content-'));out.mkdir(exist_ok=True)
(out/'golden-profiles.json').write_text(json.dumps(profiles,ensure_ascii=False,indent=2)+'\n')
(out/'interview-bank.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
(out/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2)+'\n')
print('profiles',sum(len(i['positions']) for i in profiles['industries']),'sets',len(bank),'questions',sum(len(r['questions']) for s in bank.values() for r in s['rounds'].values()))
print('Historical baseline issues:',len(issues),'(reviewed interview overlay applied below)')
# Tasks: preserve source paragraphs and list grouping, never import grading text as a candidate input.
public=json.loads((root/'platform/data/source/materials-20261017.json').read_text())['by_position']
profilemap={p['position_id']:p for i in profiles['industries'] for p in i['positions']}
def paragraphs(cell):return [p['text'].strip() for p in cell if p['text'].strip()]
def cellmd(cell,numberlists=False):
 lines=[];lastlist=None;n=0
 for p in cell:
  value=p['text'].strip()
  if not value:continue
  if numberlists and p['list_id']:
   if p['list_id']!=lastlist:n=0
   n+=1;value=f'{n}. '+re.sub(r'^\d+\.\s*','',value)
  else:n=0
  lastlist=p['list_id']
  lines.append(value)
 return '\n\n'.join(lines)
def grouped(cell,kind,pid):
 lines=paragraphs(cell);groups=[];prefix=[];cur=None
 for line in lines:
  match=(re.match(r'^(?:\d+\.)\s*.*?\((\d+)\s*(?:đ|điểm)\)',line,re.I) if kind=='numbered' else re.match(r'^(?:NHIỆM VỤ|TRÌNH BÀY).*?\((\d+)\s*(?:đ|điểm)\)',line,re.I))
  if match:
   if cur:groups.append(cur)
   cur={'heading':line,'nominal':int(match[1]),'body':[]}
  elif cur:cur['body'].append(line)
  else:prefix.append(line)
 if cur:groups.append(cur)
 result=[];conflicts=[]
 for i,g in enumerate(groups,1):
  cid='C'+str(i);children=[]
  for line in g['body']:
   m=re.search(r'\((\d+)\s*(?:đ|điểm)\)',line,re.I)
   if m:children.append((line,int(m[1])))
  # Use subpoints only when all body chunks with source points account for the heading.
  if children and sum(v for _,v in children)==g['nominal']:
   items=children
  else:
   items=[('\n'.join([g['heading']]+g['body']),g['nominal'])]
   if children and sum(v for _,v in children)!=g['nominal']:
    conflicts.append({'criterion':cid,'sourceNominal':g['nominal'],'explicitSubpointTotal':sum(v for _,v in children)})
  result.append({'criterion_id':cid,'criterion_name':re.sub(r'^\d+\.\s*','',re.split(r'\s*\(\d+\s*(?:đ|điểm)\)',g['heading'],flags=re.I)[0]).strip(' :'),'max_points':g['nominal'],'description':'\n'.join([g['heading']]+g['body']),'source_max_points':g['nominal'],'checklist':[{'checklist_id':f'{pid}-{cid}-{j}','text':s,'points':v,'scoring_source':'ai'} for j,(s,v) in enumerate(items,1)]})
 return result,'\n'.join(prefix),conflicts
def task(pid,context,reqs,rubric,bi,conflicts=None,reference=''):
 t={'position_id':pid,'position_name':profilemap[pid]['position_name'],'level':'Fresher/Junior','time_limit_minutes':60 if pid.startswith(('MKT','IT')) else 35 if pid.startswith('LOG') else 60,'time_limit_source':'specified' if pid.startswith(('MKT','IT','LOG')) else 'not_specified','source_version':'20261017','source_policy':'document_only','content_revision':'20261017-doc-only','source_block':bi,'context':context,'requirements':reqs,'rubric':rubric,'hard_constraints':[],'input_artifacts':[],'public_materials':public.get(pid,[]),'source_rubric_text':reference,'grading_ready':not bool(conflicts),'source_conflicts':conflicts or []}
 t['source_total_points']=sum(c['max_points'] for c in rubric)
 if t['source_total_points']!=100:
  t['grading_ready']=False;t['source_conflicts'].append({'kind':'task_total_conflict','sourceTotal':t['source_total_points']})
 return t
newtasks={}
for pid,ctx,extra,req,rt in [('MKT-01',281,282,283,285),('MKT-02',287,288,289,291),('MKT-03',293,294,295,297)]:
 context='\n\n'.join(blocks[n]['text'] for n in [ctx,extra]);context=re.sub(r'^–\s*','',context,flags=re.M)
 requirement=re.sub(r'^–\s*Nhiệm vụ:\s*','',blocks[req]['text'])
 reqs=[f'{i}. '+s.strip(' ;') for i,s in enumerate(re.split(r'\(\d+\)\s*',requirement)[1:],1)]
 rubric=[]
 for ci,(heading,points,desc) in enumerate(rows(rt)[1:],1):
  cid='C'+str(ci);rubric.append({'criterion_id':cid,'criterion_name':re.sub(r'^\d+\.\s*','',heading),'max_points':int(points),'description':desc,'checklist':[{'checklist_id':f'{pid}-{cid}-1','text':desc,'points':int(points),'scoring_source':'ai'}]})
 newtasks[pid]=task(pid,context,reqs,rubric,rt)
for bi,ids,style in [(355,['IT-01','IT-02','IT-03'],'numbered'),(398,['KK-01','KK-02','KK-03'],'numbered'),(441,['TCNH-02','TCNH-01','TCNH-03'],'tasks'),(491,['LOG-01','LOG-02','LOG-03'],'tasks')]:
 for pid,row in zip(ids,blocks[bi]['rows'][1:]):
  rubric,prefix,conflicts=grouped(row[3],style,pid)
  newtasks[pid]=task(pid,cellmd(row[1],True),[cellmd(row[2],True)],rubric,bi,conflicts,text(row[3]))
  if prefix:newtasks[pid]['reference_answer']=prefix
# Only the actual supplied documents may provide exercise inputs.
newtasks['IT-03']['input_artifacts']=[{'artifact_id':'IT-03-DATA-01','type':'source_table','description':'Bảng dữ liệu gốc trong ô Bối cảnh của đề Data Analyst.','required':True}]
for pid,missing in {'MKT-01':['Product Brief: chất liệu, giá, ưu đãi 48 giờ'],'MKT-02':['Dữ liệu phân nhóm quảng cáo và trang đích'],'MKT-03':['Bảng 12 từ khóa SEO']}.items():
 newtasks[pid]['missing_source_inputs']=missing
 newtasks[pid]['grading_ready']=False
# Source explicitly splits C1 in Marketing; retain those three authored component points.
for pid in ['MKT-01','MKT-02','MKT-03']:
 c=newtasks[pid]['rubric'][0]
 items=re.findall(r'(.+?)\((\d+)\)',c['description'],re.S)
 # Digital Marketing places the 15-point marker before its three explanatory
 # lines. Those lines belong to that item, not the following CPL calculation.
 if pid=='MKT-02':
  items=[]
  for chunk in c['description'].split(' · '):
   marker=re.search(r'\((\d+)\)',chunk)
   if not marker:raise ValueError(('MKT-02 missing source points',chunk))
   items.append((chunk[:marker.start()]+chunk[marker.end():],marker[1]))
 if sum(int(v) for _,v in items)!=35:raise ValueError(('MKT C1 source split',pid,items))
 c['checklist']=[{'checklist_id':f'{pid}-C1-{j}','text':clean(t),'points':int(v),'scoring_source':'ai'} for j,(t,v) in enumerate(items,1)]
finance=json.loads((root/'platform/data/source/finance-facts-20261017.json').read_text())
for pid in ['TCNH-01','TCNH-02','TCNH-03']:
 newtasks[pid]['input_artifacts']=[{'artifact_id':pid+'-DATA-01','type':'source_documents','description':'Bộ hồ sơ gốc đính kèm trong đề bài.','required':True}]
# Preserve both nested tables from the source: raw inputs public, worked answer private.
nested=blocks[355]['nested_tables']
raw=next(table for table in nested if table['row']==3 and table['column']==1)
benchmark=next(table for table in nested if table['row']==3 and table['column']==3)
(out/'IT-03-DATA-01.json').write_text(json.dumps({'artifact_id':'IT-03-DATA-01','position_id':'IT-03','source_version':'20261017','source_block':355,'input_table':{'columns':raw['rows'][0],'rows':raw['rows'][1:]},'benchmark_table':{'columns':benchmark['rows'][0],'rows':benchmark['rows'][1:]}},ensure_ascii=False,indent=2)+'\n')
tasks={'schema_version':'2.0','project':'Ready2Work','source_url':source['source_url'],'source_version':'20261017','document_purpose':'Đề bài và tiêu chí chấm theo nguyên bản nguồn; điểm mâu thuẫn chưa được tự thay đổi.','industries':[]}
for iid,name,positions in industries:
 tasks['industries'].append({'industry_id':iid,'industry_name':name,'tasks':[newtasks[iid+'-'+suffix] for suffix,_,_ in positions]})
from simulation_refresh import apply_simulation_refresh
tasks = apply_simulation_refresh(tasks, root)
print("Current simulations", [(t["position_id"], t["source_total_points"], t["grading_ready"]) for i in tasks["industries"] for t in i["tasks"]])
(out/'task-rubrics.json').write_text(json.dumps(tasks,ensure_ascii=False,indent=2)+'\n')

bank['tro-ly-thue']['source_content_issues']=['Một số ô câu hỏi Trợ lý thuế chứa nội dung tiêu chí của câu khác (bảng 420 và 422); cần xác nhận câu hỏi gốc trước khi chấm.']
for slug,item in bank.items():
 conflicts=[i for i in issues if i.get('set')==slug]
 item['grading_ready']=not bool(conflicts) and not bool(item.get('source_content_issues'))
 item['source_conflicts']=conflicts
from interview_refresh import refresh_interviews
bank=refresh_interviews(bank)
print('Reviewed interviews ready:',sum(bool(s['grading_ready']) for s in bank.values()),'of',len(bank))
(out/'interview-bank.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
for pid in ['TCNH-01','TCNH-02','TCNH-03']:
 (out/(pid+'-DATA-01.json')).write_text(json.dumps({'artifact_id':pid+'-DATA-01','position_id':pid,'source_version':'20261017','documents':finance[pid],'source_inconsistencies':finance.get('source_inconsistencies',[]) if pid=='TCNH-02' else []},ensure_ascii=False,indent=2)+'\n')

# Authorized Marketing artifacts share the same reviewed supplement as runtime tables.
supplement = json.loads((root/'platform/data/source/marketing-inputs-20261019.json').read_text())
for pid, materials in supplement['by_position'].items():
 artifact = {'artifact_id':pid+'-DATA-01','position_id':pid,'source_version':'20261019','source_policy':supplement['source_policy'],'simulated':True,'public_materials':materials}
 (out/(pid+'-DATA-01.json')).write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n')

# Explicit generator; --check verifies outputs without modifying them.
import sys
outputs={p.name:p.read_bytes() for p in out.glob('*.json') if p.name!='issues.json'}
for name,content in outputs.items():
 target=root/'platform/data'/('task-artifacts' if '-DATA-' in name else '')/name
 if '--check' in sys.argv:
  if not target.exists() or target.read_bytes()!=content:raise SystemExit('Stale source output: '+str(target))
 else:target.write_bytes(content)
shutil.rmtree(out)
