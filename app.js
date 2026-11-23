// 1) Supabase 프로젝트의 Project URL과 anon/public key를 아래에 입력하세요.
// 절대로 service_role 키를 브라우저 코드에 넣지 마세요.
const SUPABASE_URL = "https://vbtamhsiwktpveemyctl.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_3QRrcOBrRGd9_5SqQtRQgw_19i0K2BO";
const ADMIN_EMAIL = "choux0427@gmail.com";
const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const client = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
let currentUser = null, isAdmin = false, approved = [];
const tierScore = {"언랭크":0,"아이언":1,"브론즈":2,"실버":3,"골드":4,"플래티넘":5,"에메랄드":6,"다이아몬드":7,"마스터":8,"그랜드마스터":9,"챌린저":10};
function msg(id,t){$(id).textContent=t}
function tabs(){document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.tab)})}
tabs();
async function refresh(){
 if(!client)return;
 const {data:{user}}=await client.auth.getUser();currentUser=user;
 isAdmin=!!user && user.email.toLowerCase()===ADMIN_EMAIL.toLowerCase();
 $('#auth').classList.toggle('hide',!!user);$('#app').classList.toggle('hide',!user);$('#logout').classList.toggle('hide',!user);
 $('#adminTab').classList.toggle('hide',!isAdmin);$('#matchTab').classList.toggle('hide',!isAdmin);
 if(!user)return;
 const {data:mine,error:meErr}=await client.from('players').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
 if(meErr)msg('#authMsg',meErr.message);
 $('#myStatus').innerHTML=(mine||[]).map(p=>`<div>${safe(p.summoner_name)} · ${safe(p.tier)} · ${safe(p.role)} — <span class="status">${p.status==='pending'?'승인 대기':p.status==='approved'?'승인 완료':'반려'}</span></div>`).join('')||'아직 신청 내역이 없습니다.';
 const {data:pub,error}=await client.from('players').select('id,summoner_name,tier,role,status,user_id').eq('status','approved').order('summoner_name');
 if(error)msg('#authMsg',error.message);
 approved=pub||[];$('#rosterBody').innerHTML=approved.map(p=>`<tr><td>${safe(p.summoner_name)}</td><td>${safe(p.tier)}</td><td>${safe(p.role)}</td></tr>`).join('')||'<tr><td colspan="3">승인된 참가자가 없습니다.</td></tr>';
 if(isAdmin)await adminRefresh();
}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#signup').onclick=async()=>{if(!client)return;const {error}=await client.auth.signUp({email:$('#email').value.trim(),password:$('#password').value});msg('#authMsg',error?error.message:'가입 요청 완료! 이메일 확인이 필요할 수 있습니다.')};
$('#login').onclick=async()=>{if(!client)return;const {error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});msg('#authMsg',error?error.message:'로그인되었습니다.');if(!error)await refresh()};
$('#logout').onclick=async()=>{await client.auth.signOut();await refresh()};
$('#submitApply').onclick=async()=>{if(!currentUser)return;const name=$('#summoner').value.trim();if(!name)return msg('#applyMsg','소환사 이름을 입력하세요.');const {error}=await client.from('players').insert({user_id:currentUser.id,summoner_name:name,tier:$('#tier').value,role:$('#role').value,status:'pending'});msg('#applyMsg',error?error.message:'신청이 접수되었습니다. 관리자 승인 후 명단에 표시됩니다.');if(!error)await refresh()};
async function adminRefresh(){
 const {data,error}=await client.from('players').select('*,user_email:user_id').order('created_at',{ascending:false});
 if(error){msg('#authMsg','관리자 데이터 조회 오류: '+error.message);return}
 const pending=(data||[]).filter(p=>p.status==='pending');
 $('#pendingBody').innerHTML=pending.map(p=>`<tr><td>${safe(p.user_id.slice(0,8))}…</td><td>${safe(p.summoner_name)}</td><td>${safe(p.tier)}</td><td>${safe(p.role)}</td><td><button data-approve="${p.id}">승인</button> <button data-reject="${p.id}">거절</button></td></tr>`).join('')||'<tr><td colspan="5">대기 중인 신청이 없습니다.</td></tr>';
 $('#allBody').innerHTML=(data||[]).map(p=>`<tr><td>${safe(p.summoner_name)}</td><td>${safe(p.tier)}</td><td>${safe(p.role)}</td><td>${safe(p.status)}</td><td><button data-edit="${p.id}">수정</button> <button data-delete="${p.id}">삭제</button></td></tr>`).join('');
}
$('#admin').onclick=async e=>{
 if(!isAdmin)return;
 const approve=e.target.dataset.approve,reject=e.target.dataset.reject,del=e.target.dataset.delete,edit=e.target.dataset.edit;
 if(approve||reject){const {error}=await client.from('players').update({status:approve?'approved':'rejected'}).eq('id',approve||reject);if(error)alert(error.message);await refresh()}
 if(del&&confirm('이 신청/참가자를 삭제할까요?')){const {error}=await client.from('players').delete().eq('id',del);if(error)alert(error.message);await refresh()}
 if(edit){const p=approved.find(x=>x.id===edit);const {data}=await client.from('players').select('*').eq('id',edit).single();if(!data)return;const name=prompt('소환사 이름',data.summoner_name);if(name===null)return;const tier=prompt('티어',data.tier);if(tier===null)return;const role=prompt('포지션 (탑/정글/미드/원딜/서폿)',data.role);if(role===null)return;const {error}=await client.from('players').update({summoner_name:name,tier,role}).eq('id',edit);if(error)alert(error.message);await refresh()}
};
$('#makeTeams').onclick=()=>{if(!isAdmin)return;const picks=[...document.querySelectorAll('.pick:checked')].map(x=>approved.find(p=>p.id===x.value)).filter(Boolean);if(picks.length!==10)return alert('참가자 10명을 선택하세요.');let arr=[...picks];if($('#teamMode').value==='random')arr.sort(()=>Math.random()-.5);else arr.sort((a,b)=>(tierScore[b.tier]||0)-(tierScore[a.tier]||0));let blue=[],red=[];arr.forEach((p,i)=>(i%2?red:blue).push(p));$('#blueTeam').innerHTML=blue.map(p=>`<div class="player">${safe(p.summoner_name)} · ${safe(p.role)}</div>`).join('');$('#redTeam').innerHTML=red.map(p=>`<div class="player">${safe(p.summoner_name)} · ${safe(p.role)}</div>`).join('')};
function renderPicker(){ $('#teamPick').innerHTML=approved.map(p=>`<label><input class="pick" type="checkbox" value="${p.id}"> ${safe(p.summoner_name)} <small class="muted">${safe(p.tier)}</small></label>`).join('') }
const oldRefresh=refresh;refresh=async()=>{await oldRefresh();if(isAdmin)renderPicker()};
if(!configured){$('#configNotice').classList.remove('hide');$('#auth').classList.add('hide')}else{$('#configNotice').classList.add('hide');refresh();client.auth.onAuthStateChange(()=>setTimeout(refresh,0))}
