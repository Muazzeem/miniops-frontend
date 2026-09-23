import {createFileRoute} from '@tanstack/react-router';
import {AdminPage} from '@/features/pages';

export const Route=createFileRoute('/_workspace/admin')({
  head:()=>({meta:[
    {title:'Admin — MiniOps'},
    {name:'description',content:'Manage MiniOps workspace users, organizations, plans, and subscriptions.'},
    {property:'og:title',content:'Admin — MiniOps'},
    {property:'og:description',content:'Manage MiniOps workspace users, organizations, plans, and subscriptions.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'},
  ]}),
  component:AdminPage,
});