// Henter live-data til "Vandstand ved Stubberup" én gang i timen.
// Skriver data/latest.json (siden læser den) og arkiverer DMI's DKSS-prognose og målinger i data/arkiv/.
import {mkdirSync,writeFileSync,existsSync,readFileSync} from "node:fs";
const now=Math.floor(Date.now()/3600e3)*3600e3, iso=d=>new Date(d).toISOString().slice(0,19)+"Z";
const U={
 W:"https://api.open-meteo.com/v1/forecast?latitude=54.55,54.9,55.5,57.5&longitude=11.50,13.5,15.5,19.5&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&past_days=3&forecast_days=7&timezone=UTC",
 G:`https://opendataapi.dmi.dk/v2/oceanObs/collections/observation/items?stationId=31616&parameterId=sealev_dvr&datetime=${iso(now-48*3600e3)}/${iso(now+3600e3)}&limit=500`,
 R:`https://opendataapi.dmi.dk/v2/oceanObs/collections/observation/items?stationId=31573&parameterId=sealev_dvr&datetime=${iso(now-48*3600e3)}/${iso(now+3600e3)}&limit=500`,
 H:`https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::mareograph::simple&fmisid=132310&parameters=WATLEV&timestep=60&starttime=${iso(now-72*3600e3)}`,
 E:"https://opendataapi.dmi.dk/v2/oceanObs/collections/observation/items?stationId=25149&parameterId=sealev_dvr&period=latest-day&limit=200",
 D:"https://opendataapi.dmi.dk/v1/forecastedr/collections/dkss_idw/position?coords=POINT(11.70%2054.64)&parameter-name=sea-mean-deviation&f=CoverageJSON",
 DG:"https://opendataapi.dmi.dk/v1/forecastedr/collections/dkss_idw/position?coords=POINT(11.93%2054.57)&parameter-name=sea-mean-deviation&f=CoverageJSON",
 S:"https://opendata-download-ocobs.smhi.se/api/version/1.0/parameter/6/station/2069/period/latest-day/data.csv",
 X:"https://ensemble-api.open-meteo.com/v1/ensemble?latitude=54.55,54.9,55.5,57.5&longitude=11.50,13.5,15.5,19.5&hourly=wind_speed_10m,wind_direction_10m&models=ecmwf_ifs025&wind_speed_unit=ms&past_days=3&forecast_days=7&timezone=UTC"
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function hent(k,u){for(let i=0;i<4;i++){try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),60000);const r=await fetch(u,{signal:ac.signal,headers:{"User-Agent":"vandstand-stubberup (github.com/chrillemark-alt/vandstand)"}});clearTimeout(to);if(r.ok)return await r.text();console.log(k,"HTTP",r.status)}catch(e){console.log(k,"fejl",e.message)}await sleep(15000*(i+1))}return null}
const raw={},status={};
for(const [k,u] of Object.entries(U)){raw[k]=await hent(k,u);status[k]=raw[k]?"ok":"mangler";await sleep(1500)}
// Behold sidste gode DKSS, hvis DMI ikke svarer, men marker alderen.
let old=null;try{old=JSON.parse(readFileSync("data/latest.json","utf8"))}catch(e){}
const tid=Date.now(),at={};for(const k in U)at[k]=raw[k]?tid:(old&&old.at&&old.at[k])||null;
for(const k in U)if(!raw[k]&&old&&old.raw&&old.raw[k])raw[k]=old.raw[k];
mkdirSync("data",{recursive:true});
writeFileSync("data/latest.json",JSON.stringify({made:Date.now(),at,status,raw}));
// Arkiv: DKSS (lagune og Gedser) og målinger, én fil pr. time.
const d=new Date(now),dir=`data/arkiv/${d.toISOString().slice(0,10)}`;mkdirSync(dir,{recursive:true});
const pick=k=>status[k]==="ok"?raw[k]:null;
writeFileSync(`${dir}/${d.toISOString().slice(11,13)}.json`,JSON.stringify({t:iso(now),status,D:pick("D"),DG:pick("DG"),G:pick("G"),R:pick("R"),S:pick("S"),H:pick("H")}));
console.log(JSON.stringify(status));
