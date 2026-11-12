// Estado de objetivos puro e serializável; os selos são concedidos pelo motor uma única vez.
export function turnValve(S,index){
 if(![0,1].includes(index)||S.flags['cooling_'+index])return false;
 S.flags['cooling_'+index]=true;S.flags.valves_closed=!!(S.flags.cooling_0&&S.flags.cooling_1);return true;
}
export function takeBackup(S){if(!S.flags.turbines_off||!S.flags.turbine_defense_cleared||S.flags.backup_secured)return false;S.flags.backup_secured=true;return true;}
export function useCrane(S){if(!S.flags.crane_fuse||S.flags.crane_online)return false;S.flags.crane_online=true;return true;}
export function armDischarge(S){if(!S.flags.backup_secured||!S.flags.roof_defense_cleared||S.flags.discharge_stopped)return false;S.flags.discharge_stopped=true;return true;}
export function sealEligibility(S){return {cooling:!!S.flags.valves_closed,turbines:!!S.flags.backup_secured,crane:!!S.flags.crane_online};}
export function steamActive(S,index,time){if(S.flags['cooling_'+index]||S.flags.discharge_stopped)return false;const phase=((time+index*1.5)%4.8+4.8)%4.8;return phase>=1.4&&phase<2.8;}
