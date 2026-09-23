import {createFileRoute} from '@tanstack/react-router';
import {ActivityPage} from '@/features/pages';

export const Route=createFileRoute('/_workspace/activity')({
  head:()=>({meta:[
    {title:'Activity — MiniOps'},
    {name:'description',content:'Review recent agency activity across projects, time, expenses, and team access.'},
    {property:'og:title',content:'Activity — MiniOps'},
    {property:'og:description',content:'Review recent agency activity across projects, time, expenses, and team access.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'},
  ]}),
  component:ActivityPage,
});