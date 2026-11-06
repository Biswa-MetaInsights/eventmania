'use client';
import { useEffect, useRef, useState } from 'react';
import type { Event } from '@eventmind/types';
import type { City } from '@eventmind/store';
import 'leaflet/dist/leaflet.css';

export function EventMap({events,center,radius,onPick}:{events:Event[];center:City;radius:number;onPick?:(city:City)=>void}) {
  const element=useRef<HTMLDivElement>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let disposed=false;
    let map:import('leaflet').Map|undefined;
    void import('leaflet').then(L=>{
      if(disposed||!element.current)return;
      map=L.map(element.current,{scrollWheelZoom:false}).setView([center.lat,center.lng],8);
      const tiles=L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
      tiles.on('tileerror',()=>setError('Map tiles are unavailable. Event results remain available below.'));
      tiles.addTo(map);
      L.circle([center.lat,center.lng],{radius:radius*1000,color:'var(--brand-green)',fillOpacity:.04,weight:2}).addTo(map);
      L.circleMarker([center.lat,center.lng],{radius:6,color:'var(--brand-terracotta)'}).bindTooltip('Search centre').addTo(map);
      for(const event of events){
        const lat=Number(event.location?.latitude),lng=Number(event.location?.longitude);
        if(event.location?.latitude==null||event.location?.longitude==null||!Number.isFinite(lat)||!Number.isFinite(lng))continue;
        const content=document.createElement('div');const link=document.createElement('a');link.href=`/event/${encodeURIComponent(event.id)}`;link.textContent=event.title;content.append(link);
        const info=document.createElement('p');info.textContent=event.distance_km!=null?`${event.distance_km} km away`:'';content.append(info);
        L.circleMarker([lat,lng],{radius:9,color:'var(--brand-green)',fillOpacity:.85}).bindPopup(content).addTo(map);
      }
      if(onPick)map.on('click',e=>onPick({...center,name:'Map location',lat:e.latlng.lat,lng:e.latlng.lng}));
      const bounds=L.latLng(center.lat,center.lng).toBounds(radius*2000);map.fitBounds(bounds,{padding:[12,12],maxZoom:12});
    }).catch(()=>setError('The map could not be loaded. You can still browse the event list.'));
    return()=>{disposed=true;map?.remove();};
  },[events,center,radius,onPick]);
  return <section aria-label="Map of nearby events" className="space-y-2"><div ref={element} className="h-[360px] sm:h-[450px] w-full rounded-lg border-2 border-[var(--brand-control-border)] z-0"/>{error&&<p role="status">{error}</p>}<p className="text-[15px]">Distances are straight-line distances. Click a map marker to open an event.{onPick?' Click elsewhere to move the search centre.':''}</p></section>;
}
