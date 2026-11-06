/** Venue wall times are converted explicitly; browser time zones never decide the event time. */
export function localEventTime(iso: string, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
  const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function eventTimeUtc(value: string, zone: string): Date {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid event date and time.');
  const [date,time]=value.split('T'),[y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
  const target=Date.UTC(y,m-1,d,h,min);
  let guess=target;
  for(let i=0;i<4;i++){
    const represented=localEventTime(new Date(guess).toISOString(),zone);
    if(represented===value)return new Date(guess);
    const [rd,rt]=represented.split('T'),[ry,rm,rday]=rd.split('-').map(Number),[rh,rmin]=rt.split(':').map(Number);
    guess-=Date.UTC(ry,rm-1,rday,rh,rmin)-target;
  }
  throw new Error('This local time does not exist because the clocks change. Please choose another time.');
}
