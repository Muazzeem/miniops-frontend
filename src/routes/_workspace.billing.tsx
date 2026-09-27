import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/_workspace/billing')({beforeLoad:()=>{throw redirect({to:'/settings',search:{section:'Billing'}})}});
