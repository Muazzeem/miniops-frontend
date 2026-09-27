import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/_workspace/reports/revenue')({beforeLoad:()=>{throw redirect({to:'/app'})}});
