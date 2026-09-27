import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/_workspace/reports/clients')({beforeLoad:()=>{throw redirect({to:'/app'})}});
