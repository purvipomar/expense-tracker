// Your existing AWS HTTP API. Do not put secret keys in frontend code.
const API_URL = "https://k19hi7oh5f.execute-api.ap-south-1.amazonaws.com/expenses";
const $ = (id) => document.getElementById(id);
let expenses = [];
let editingId = null;
const money = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(n)||0);
function setNotice(msg, error=false){$('notice').textContent=msg;$('notice').classList.toggle('error',error)}
function setConnection(text, ok){$('connection').textContent=text;$('connection').className='pill '+(ok?'ok':'bad')}
async function request(url, options={}){
  let res;
  try {res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}})}
  catch(_){throw new Error('Could not connect. Check your API URL, CORS origin, and connection.')} 
  let payload;
  try{payload=await res.json()}catch(_){throw new Error('The server returned an invalid response.')} 
  if(!res.ok)throw new Error(payload.error||payload.message||`Request failed (${res.status})`);
  return payload;
}
function makeExpenseRow(item){
  const row=document.createElement('div');row.className='expense';
  const info=document.createElement('div');info.className='expense-info';
  const title=document.createElement('strong');title.textContent=item.title||'Untitled';
  const category=document.createElement('small');category.textContent=item.category||'Other';
  info.append(title,category);
  const amount=document.createElement('span');amount.className='expense-amount';amount.textContent=money(item.amount);
  const actions=document.createElement('div');actions.className='expense-actions';
  const edit=document.createElement('button');edit.textContent='Edit';edit.type='button';edit.setAttribute('aria-label',`Edit ${item.title}`);edit.onclick=()=>startEdit(item);
  const del=document.createElement('button');del.textContent='Delete';del.className='danger';del.type='button';del.setAttribute('aria-label',`Delete ${item.title}`);del.onclick=()=>deleteExpense(item);
  actions.append(edit,del);row.append(info,amount,actions);return row;
}
function render(){
  $('total').textContent=money(expenses.reduce((sum,e)=>sum+Number(e.amount||0),0));
  $('count').textContent=expenses.length;
  const categories=[...new Set(expenses.map(e=>e.category||'Other'))].sort();
  $('categories').textContent=categories.length;
  const filter=$('filter'), old=filter.value;
  filter.replaceChildren(new Option('All categories',''),...categories.map(c=>new Option(c,c)));
  filter.value=categories.includes(old)?old:'';
  renderList();
}
function renderList(){
  const search=$('search').value.trim().toLowerCase(),category=$('filter').value;
  const selected=expenses.filter(e=>(!category||e.category===category)&&(!search||String(e.title).toLowerCase().includes(search)||String(e.category).toLowerCase().includes(search)));
  $('expenseList').replaceChildren();
  if(!selected.length){const p=document.createElement('p');p.className='empty';p.textContent=expenses.length?'No matching expenses.':'No expenses yet. Add your first one!';$('expenseList').append(p);return}
  selected.forEach(e=>$('expenseList').append(makeExpenseRow(e)));
}
async function loadExpenses(){
  $('refreshBtn').disabled=true;
  try{const result=await request(API_URL);expenses=Array.isArray(result.expenses)?result.expenses:[];render();setConnection('API connected',true)}
  catch(error){setConnection('Connection failed',false);setNotice(error.message,true);$('expenseList').textContent='Unable to load expenses.'}
  finally{$('refreshBtn').disabled=false}
}
function resetForm(){editingId=null;$('expenseForm').reset();$('formTitle').textContent='Add an expense';$('formSubtitle').textContent='Record your latest purchase.';$('submitBtn').textContent='+ Add expense';$('cancelEdit').classList.add('hidden')}
function startEdit(item){editingId=item.id;$('title').value=item.title;$('amount').value=item.amount;$('category').value=[...$('category').options].some(o=>o.value===item.category)?item.category:'Other';$('formTitle').textContent='Edit expense';$('formSubtitle').textContent='Update an existing transaction.';$('submitBtn').textContent='Save changes';$('cancelEdit').classList.remove('hidden');$('title').focus();window.scrollTo({top:0,behavior:'smooth'})}
$('expenseForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const payload={title:$('title').value.trim(),amount:Number($('amount').value),category:$('category').value};
  if(!payload.title||!Number.isFinite(payload.amount)||payload.amount<=0)return setNotice('Enter a title and a positive amount.',true);
  $('submitBtn').disabled=true;setNotice('Saving…');
  try{await request(editingId?`${API_URL}/${encodeURIComponent(editingId)}`:API_URL,{method:editingId?'PUT':'POST',body:JSON.stringify(payload)});setNotice(editingId?'Expense updated!':'Expense added!');resetForm();await loadExpenses()}
  catch(error){setNotice(error.message,true)}finally{$('submitBtn').disabled=false}
});
async function deleteExpense(item){
  if(!confirm(`Delete "${item.title}" (${money(item.amount)})? This cannot be undone.`))return;
  try{await request(`${API_URL}/${encodeURIComponent(item.id)}`,{method:'DELETE'});if(editingId===item.id)resetForm();setNotice('Expense deleted!');await loadExpenses()}
  catch(error){setNotice(error.message,true)}
}
$('refreshBtn').onclick=loadExpenses;$('cancelEdit').onclick=resetForm;$('search').oninput=renderList;$('filter').onchange=renderList;
loadExpenses();
