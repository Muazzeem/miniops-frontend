import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/_workspace/notifications')({beforeLoad:()=>{throw redirect({to:'/app'})}});
