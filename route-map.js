  // A lightweight itinerary. These reservations are consumed by the real generator;
  // opening the map never constructs distant villages or advances scenery randomness.
  const ROUTE_MAP_ART=__ROUTE_MAP_ART__;
  const ROUTE_KEYS=['town','quiet','trees','lake','runout','christmas','avalanche','cemetery','halloween','rivalRace','forest','denseForest','boulder','scramble','piedPiper','werewolfIntro','ravagerIntro','burrowField','crowd','beginner','legendarium','opening','night','day'];
  const ROUTE_NAMES={town:'Alpine Village',quiet:'Snowy Trail',trees:'Winding Grove',lake:'Stillwater Lake',runout:'Long Glide',christmas:'Christmas Parade',avalanche:'Snowball Run',cemetery:'Frost Rest Cemetery',halloween:'Pumpkin Town',rivalRace:'Rival Race',forest:'Open Pines',denseForest:'Close Pines',boulder:'Boulder Run',scramble:'Wild Patch',piedPiper:'Keep Your Momentum',werewolfIntro:'A Hairy Encounter',ravagerIntro:'The Hungry Stranger',burrowField:'Burrower Field',crowd:'Rush Hour Slope',beginner:'Beginner Slope',legendarium:'Legendary Encounters',opening:'Gentle Start'};
  let routeMapButton;
  function routeRoll(a){a.routeSeed=(Math.imul(a.routeSeed??(seed^0x9e3779b9),1664525)+1013904223)>>>0;return a.routeSeed/4294967296;}
  function rebaseRouteQueue(a){let y=a.nextEncounterY,crowd=a.lastCrowdEndY;for(const row of a.routeQueue||[]){row.startY=y;row.endY=y+row.length;if(row.kind==='crowd')crowd=row.endY;row.lastCrowdEndYAfter=crowd??null;y=row.endY+row.gapAfter;}}
  function reserveRoute(a,count=10){
    if(!a||a.debug)return;rebaseRouteQueue(a);a.routeQueue??=[];
    const R=S.endless.regions,q=a.routeQueue,last=q.at(-1),shadow={startY:a.startY,regionOrderIndex:last?.cursorAfter??a.regionOrderIndex,lastEncounterKind:last?.kind??a.lastEncounterKind,lastCrowdEndY:last?last.lastCrowdEndYAfter??undefined:a.lastCrowdEndY};
    let y=last?last.endY+last.gapAfter:a.nextEncounterY;
    while(q.length<count){const kind=R.enabled?nextEndlessRegionKind(shadow,y,()=>routeRoll(a)):shadow.lastEncounterKind==='town'?'trees':'town',bounds=R.enabled?(R.lengthMetres[kind]||(kind==='crowd'?R.lengthMetres.beginner:null)||S.endless.encounters.lengthMetres):S.endless.encounters.lengthMetres,scale=endlessScaleAt((y-a.startY)/PX_PER_M),length=mix(bounds[0],bounds[1],routeRoll(a))*PX_PER_M*scale*(kind==='christmas'?R.festivals.christmasParade.lengthMultiplier:1),gapAfter=mix(...(R.enabled?R.gapMetres:S.endless.encounters.gapMetres),routeRoll(a))*PX_PER_M*scale;
      shadow.lastEncounterKind=kind;if(kind==='crowd')shadow.lastCrowdEndY=y+length;
      const row={kind,startY:y,endY:y+length,length,gapAfter,cursorAfter:shadow.regionOrderIndex||0,night:!!(Math.floor(Math.max(0,(shadow.regionOrderIndex||1)-1)/R.order.length)%2),lastCrowdEndYAfter:shadow.lastCrowdEndY??null};q.push(row);y=row.endY+gapAfter;
    }
  }
  function takeRouteReservation(a,startY){
    if(!a.routeQueue?.length||a.debug)return null;
    // nextEncounterY can move when a special area's runout is extended.
    rebaseRouteQueue(a);const row=a.routeQueue.shift();row.startY=startY;row.endY=startY+row.length;a.regionOrderIndex=row.cursorAfter;return row;
  }
  function routeActualRow(e){return {kind:e.kind,title:e.title||ROUTE_NAMES[e.kind],townName:e.town?.name,startY:e.startY,endY:e.endY,length:e.endY-e.startY,gapAfter:e.routeGapAfter??0,cursorAfter:e.regionOrderIndex||0,night:!!e.night};}
  function saveRoutePreview(a,lift){
    reserveRoute(a,10);return [...a.encounters.filter(e=>e.startY>=lift.encounter.endY).map(routeActualRow),...a.routeQueue].slice(0,14).map(r=>({kind:r.kind,title:r.title,townName:r.townName,startMetres:(r.startY-a.startY)/PX_PER_M,lengthMetres:r.length/PX_PER_M,gapMetres:r.gapAfter/PX_PER_M,cursorAfter:r.cursorAfter,night:r.night}));
  }
  function restoreRoutePreview(a,resume){
    a.mapAvailable=true;if(Number.isFinite(resume.routeSeed))a.routeSeed=resume.routeSeed>>>0;
    const kinds=new Set([...S.endless.regions.order,'crowd']);a.routeQueue=(Array.isArray(resume.routeQueue)?resume.routeQueue:[]).slice(0,14).filter(r=>kinds.has(r.kind)&&[r.startMetres,r.lengthMetres,r.gapMetres,r.cursorAfter].every(Number.isFinite)&&r.lengthMetres>0&&r.lengthMetres<1e6&&r.gapMetres>=0&&r.cursorAfter>=0).map(r=>({...r,startY:a.startY+r.startMetres*PX_PER_M,length:r.lengthMetres*PX_PER_M,gapAfter:r.gapMetres*PX_PER_M}));
  }
  function addRouteMapPickup(lift,section,e){
    const y=Math.min(e.endY-80,lift.y+(S.endless.checkpoint.mapAfterMetres??24)*PX_PER_M),x=encounterPathX(e.paths[0],y)+42;
    entity('routeMapPickup',x,y,{r:0,width:42,arcadeRun:section,encounter:e,town:e.town,lift});
  }
  function takeRouteMapPickup(o,previous){
    const p=state.p;if(o.collected||!o.lift.taken||p.air>0||p.fall>0||p.awaitingInput||state.sceneCard)return false;
    const dy=p.y-previous.y,t=dy?clamp((o.y-previous.y)/dy,0,1):1,x=mix(previous.x,p.x,t),y=mix(previous.y,p.y,t);
    if(Math.hypot(x-o.x,y-o.y)>30)return false;o.collected=true;showRouteMap();return true;
  }
  function initRouteMapButton(){
    routeMapButton=document.createElement('button');routeMapButton.id='route-map';routeMapButton.type='button';routeMapButton.title='Open route map';routeMapButton.setAttribute('aria-label','Open route map');
    routeMapButton.style.cssText='position:fixed;right:max(12px,env(safe-area-inset-right));top:78px;z-index:12;width:48px;height:48px;border:2px solid #c7a474;border-radius:8px;background:#f3ead5;cursor:pointer;padding:5px;touch-action:manipulation;display:none';
    const icon=document.createElement('canvas');icon.width=40;icon.height=36;icon.style.cssText='width:100%;height:100%;image-rendering:pixelated';routeMapButton.append(icon);const c=icon.getContext('2d');c.imageSmoothingEnabled=false;const f=ROUTE_MAP_ART.map.frames[0];c.drawImage(images.mapPickup,f.x,f.y,f.w,f.h,0,0,40,36);
    routeMapButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showRouteMap();});document.body.append(routeMapButton);syncRouteMapButton();
  }
  function syncRouteMapButton(){if(!routeMapButton)return;const visible=!!(state.endless?.mapAvailable&&!state.endless.debug&&!state.sceneCard&&!state.deathTimer);if(routeMapButton.hidden===visible){routeMapButton.hidden=!visible;routeMapButton.style.display=visible?'block':'none';}}
  function showRouteMap(){
    const a=state.endless;if(!a||a.debug||!a.mapAvailable||state.sceneCard||state.deathTimer)return false;
    reserveRoute(a,10);const p=state.p,actual=a.encounters.filter(e=>e.endY>p.y).map(routeActualRow),rows=[...actual,...a.routeQueue].slice(0,10);
    if(!rows.length)return false;if(p.y<rows[0].startY)rows.unshift({kind:'quiet',title:'Connecting Trail',startY:p.y,endY:rows[0].startY,night:isNight()});
    if(!showSceneCard('route-map','YOUR ROUTE','The next ten areas of your slope.'))return false;state.sceneCard.routeRows=rows.slice(0,10);syncRouteMapButton();render();return true;
  }
  function routeIcon(kind,x,y,size=24){const index=ROUTE_KEYS.indexOf(kind),f=ROUTE_MAP_ART.icons.frames[Math.max(0,index)];ctx.imageSmoothingEnabled=false;ctx.drawImage(images.stageIcons,f.x,f.y,f.w,f.h,x-size/2,y-size/2,size,size);}
  function drawRouteMap(){
    const card=state.sceneCard,rows=card.routeRows,p=state.p;box(0,0,W,H,'#18333f');const top=65,bottom=H-30,step=Math.min(54,(bottom-top-35)/10),left=25;
    box(left,25,W-2*left,H-50,'#f3ead5');text('YOUR ROUTE',W/2,50,16,C.teal);
    for(let i=0;i<rows.length;i++){const r=rows[i],y=top+step*(i+.5);if(!i)box(left+6,y-step/2+2,W-2*left-12,step-4,'#dae2cc');
      line(62,y-step/2,62,y+step/2,'#a6bec5',2);routeIcon(r.kind,62,y,30);text(r.title||r.townName||ROUTE_NAMES[r.kind]||'Snowy Slope',W/2+13,y-3,Math.min(12,step*.25),C.ink);
      text(!i?'YOU ARE HERE':Math.max(0,Math.round((r.startY-p.y)/PX_PER_M))+' m ahead',W/2+13,y+13,9,C.muted);routeIcon(r.night?'night':'day',W-left-25,y,20);
      if(!i){const t=clamp((p.y-r.startY)/(r.endY-r.startY||1),0,1);sprite('skier',left+13,y-step*.3+step*.6*t,22,{ui:true});}
    }card.shown=true;
  }
  function drawRouteMapPickup(o,s){
    if(o.type!=='routeMapPickup')return false;if(o.collected)return true;const index=Math.floor(clock*2)%2,f=ROUTE_MAP_ART.map.frames[index];ctx.imageSmoothingEnabled=false;ctx.drawImage(images.mapPickup,f.x,f.y,f.w,f.h,s.x-f.w/2,s.y-f.h+8,f.w,f.h);return true;
  }
