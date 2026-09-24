import {now,account,type AppEnv} from './meta';
import {licenseFor} from './license';
export async function nextWake(env:AppEnv):Promise<number|null>{
 const limit=await env.DB.prepare("SELECT min(updated)+3601 wake,count(*) n FROM jobs WHERE updated>? AND status IN ('sent','sending','uncertain')").bind(now()-3600).first<{wake:number|null;n:number}>();
 const rows=await env.DB.prepare(`SELECT min(wake) wake FROM (
  SELECT max(not_before,?) wake FROM jobs WHERE status='pending' AND expires>? AND rule_id IN (SELECT id FROM rules WHERE active=1) AND (parent IS NULL OR parent IN (SELECT id FROM jobs WHERE status='sent'))
  UNION ALL SELECT CAST(json_extract(config,'$.wake') AS INTEGER) wake FROM conversations WHERE stage='wait' AND expires>? AND rule_id IN (SELECT id FROM rules WHERE active=1)
  UNION ALL SELECT updated+181 wake FROM jobs WHERE status='sending' AND expires>?
  UNION ALL SELECT ? wake FROM flow_inputs WHERE status='pending' AND expires>?
 )`).bind(now(),now(),now(),now(),now(),now()).first<{wake:number|null}>();
 if(rows?.wake==null)return null;
 const connected=await account(env);if(!connected||!await licenseFor(env,connected.id))return null;
 return Math.max(rows.wake,(limit?.n||0)>=60?limit!.wake||now()+3600:0);
}
export async function schedulePending(env:AppEnv){
 if(!env.FLOW_SCHEDULER||env.IN_FLOW_ALARM||!env.PROFILE_ID)return;
 const next=await nextWake(env);if(next===null)return;
 await env.FLOW_SCHEDULER.getByName(env.PROFILE_ID).schedule(env.PROFILE_ID,next*1000);
}

