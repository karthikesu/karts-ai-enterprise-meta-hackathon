const KL_TIME_ZONE = 'Asia/Kuala_Lumpur';

function malaysiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')) };
}

export function malaysiaDateAfter(days, now = new Date()) {
  const { year, month, day } = malaysiaDateParts(now);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function demoSlot(daysFromNow, time, now = new Date()) {
  return `${malaysiaDateAfter(daysFromNow, now)}T${time}:00+08:00`;
}

export const shops = [
  {
    id: 'kopi-maju',
    name: 'Kopi Maju',
    services: ['catering pickup', 'cake order'],
    hours: 'Mon-Sat 9:00-18:00',
    slots: [demoSlot(1, '17:30'), demoSlot(2, '10:30')]
  },
  {
    id: 'kedai-runcit-am',
    name: 'Kedai Runcit A&M',
    services: ['bulk grocery order', 'parcel pickup'],
    hours: 'Daily 8:00-20:00',
    slots: [demoSlot(1, '19:30'), demoSlot(3, '11:00')]
  },
  {
    id: 'meena-tailor',
    name: 'Meena Tailor',
    services: ['blouse fitting', 'saree alteration'],
    hours: 'Tue-Sun 10:00-19:00',
    slots: [demoSlot(2, '16:00'), demoSlot(4, '12:30')]
  }
];
