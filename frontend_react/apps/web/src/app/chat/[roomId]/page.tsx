'use client';
import { use } from 'react';
import { EventRooms } from '@/components/EventRooms';
export default function ChatRoomPage({params}:{params:Promise<{roomId:string}>}){return <EventRooms roomId={use(params).roomId}/>;}
