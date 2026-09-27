import {createFileRoute} from '@tanstack/react-router';
import {LeadsPage} from '@/features/leads-subscriptions';

export const Route=createFileRoute('/_workspace/leads')({
 head:()=>({meta:[{title:'Leads — MiniOps'},{name:'description',content:'Track lead response times without a complex CRM.'},{property:'og:title',content:'Leads — MiniOps'},{property:'og:description',content:'Track lead response times without a complex CRM.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:LeadsPage,
});