import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/_workspace/reports/projects')({beforeLoad:()=>{throw redirect({to:'/app'})}});
