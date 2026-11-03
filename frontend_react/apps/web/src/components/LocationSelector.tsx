'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@eventmind/api';
import { CITIES, type City } from '@eventmind/store';
import { inputCls } from '@/components/FormControls';
import { OUTLINE_BUTTON } from '@/lib/controls';

export function LocationSelector({value,onChange}:{value:City;onChange:(city:City)=>void}) {
  const [query,setQuery]=useState('');
  const [search,setSearch]=useState('');
  const [message,setMessage]=useState('');
  const places=useQuery({queryKey:['places',search],queryFn:()=>apiClient.get<{items:City[]}>('/event/locations',{params:{q:search}}).then(r=>r.data.items),enabled:search.length>=2,staleTime:86400000});
  const fallback=CITIES.filter(c=>!search||c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const results=places.data?.length?places.data:fallback;
  return <div className="space-y-3 min-w-0">
    <p className="font-semibold break-words">{value.name}{value.country?` · ${value.country}`:''}</p>
    <div className="flex gap-2"><label className="flex-1 min-w-0"><span className="sr-only">Town or city</span><input className={`${inputCls(false)} w-full`} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setSearch(query.trim());}}} placeholder="Search town or city" maxLength={100}/></label><button type="button" className={`px-3 py-2 rounded-lg ${OUTLINE_BUTTON}`} onClick={()=>setSearch(query.trim())}>Find</button></div>
    <p className="text-[15px]">Your chosen search centre is included when you share this search. Using the map requests tiles for that area from OpenStreetMap.</p>
    <button type="button" className={`w-full px-3 py-2 rounded-lg ${OUTLINE_BUTTON}`} onClick={()=>{
      if(!navigator.geolocation){setMessage('Location is unavailable. Choose a town or enter coordinates.');return;}
      setMessage('Requesting your location…');navigator.geolocation.getCurrentPosition(position=>{onChange({name:'Current location',country:'',lat:Number(position.coords.latitude.toFixed(3)),lng:Number(position.coords.longitude.toFixed(3)),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});setMessage('Location selected. It is used to search nearby events.');},()=>setMessage('Location permission was declined or unavailable. You can choose a town instead.'),{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
    }}>Use my location</button>
    {message&&<p role="status" className="text-[15px]">{message}</p>}
    {places.isFetching?<p>Finding places…</p>:<ul className="max-h-48 overflow-y-auto">{results.slice(0,20).map(city=><li key={`${city.name}-${city.country}-${city.lat}`}><button type="button" className="block w-full text-left p-2 rounded-lg hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)]" onClick={()=>onChange(city)}>{city.name}{city.country?` · ${city.country}`:''}</button></li>)}</ul>}
    {!!search&&!places.isFetching&&!results.length&&<p>No matching town found. Enter coordinates below or select a point on the map.</p>}
    <details><summary className="cursor-pointer">Enter coordinates</summary><div className="grid grid-cols-2 gap-2 mt-2">
      <label>Latitude<input className={`${inputCls(false)} w-full`} type="number" min={-90} max={90} step="any" value={value.lat} onChange={e=>{const lat=Number(e.target.value);if(Number.isFinite(lat)&&Math.abs(lat)<=90)onChange({...value,name:'Chosen location',lat});}}/></label>
      <label>Longitude<input className={`${inputCls(false)} w-full`} type="number" min={-180} max={180} step="any" value={value.lng} onChange={e=>{const lng=Number(e.target.value);if(Number.isFinite(lng)&&Math.abs(lng)<=180)onChange({...value,name:'Chosen location',lng});}}/></label>
    </div></details>
    <p className="text-[15px]">Town/city data: <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>, CC BY 4.0. Small settlements and postcodes may not be listed.</p>
  </div>;
}
