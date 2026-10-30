export function androidArgs(body, stored) {
 if(!stored||!/^[a-f0-9]{64}$/.test(body.scopeKey||'')||body.scopeKey!==stored.scopeKey)throw Error('not_found');
 if(Date.now()-stored.createdAt>2*3600_000)throw Error('artifact_expired');
 const allowed=['token','handle','scopeKey','goal','className','methodName','query'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw Error('invalid_parameters');
 if(body.goal==='overview')return ['inspect-android-package'];
 if(body.goal==='search'){
  if(typeof body.query!=='string'||body.query.length<1||body.query.length>100||body.query.startsWith('-'))throw Error('invalid_query');
  return ['search-android-classes',body.query];
 }
 if(!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/.test(body.className||''))throw Error('invalid_class');
 if(body.goal==='class')return ['inspect-android-class',body.className];
 if(body.goal==='references')return ['trace-android-references',body.className];
 if(body.goal==='method'&&/^[A-Za-z_$][\w$]*$/.test(body.methodName||''))return ['inspect-android-method',body.className,body.methodName];
 throw Error('invalid_goal');
}
