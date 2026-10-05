const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

export class BlackwallEncounter {
  constructor(random=Math.random) {
    this.random=random; this.state='idle'; this.next=180+random()*120;
    this.repelled=new Set(); this.comboBag=[];
  }
  trigger(time) {
    if(this.state!=='idle')return false;
    if(!this.comboBag.length) {
      this.comboBag=[0,1,2];
      for(let i=2;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.comboBag[i],this.comboBag[j]]=[this.comboBag[j],this.comboBag[i]];}
      if(this.comboBag.at(-1)===this.comboId)this.comboBag.reverse();
    }
    this.comboId=this.comboBag.pop(); this.start=time; this.state='breach'; this.dismissedAt=null;
    this.repelled.clear(); this.hitAt=[-100,-100,-100]; return true;
  }
  dismiss(time) {
    if(this.state!=='breach' || this.dismissedAt!=null)return;
    this.dismissedAt=time;
    for(let i=0;i<3;i++) {
      if(!this.repelled.has(i)) { this.repelled.add(i); this.hitAt[i]=time; }
    }
  }
  repel(index,time) {
    if(this.state!=='breach'||time-this.start<1||time-this.start>23||this.repelled.has(index))return null;
    this.repelled.add(index);this.hitAt[index]=time;
    return `breach:${this.start}:${index}`;
  }
  unlock(time) {
    if(['crossing','moonbound','returning'].includes(this.state))return;
    this.wonFromBreach=this.state==='breach'; this.state='crossing';this.wonAt=time;
  }
  returnToWall(time) {
    if(!['crossing','moonbound'].includes(this.state))return false;
    this.returnMoon=this.state==='crossing'?ease(1.1,6,time-this.wonAt):1;
    this.state='returning';this.returnAt=time;return true;
  }
  update(time,aspect) {
    if(this.state==='breach' && this.dismissedAt!=null && time-this.dismissedAt>=1.35) {
      this.state='idle';this.next=time+180+this.random()*120;
    }
    let moon=0;
    if(this.state==='crossing') {moon=ease(1.1,6,time-this.wonAt);if(moon===1)this.state='moonbound';}
    else if(this.state==='moonbound')moon=1;
    else if(this.state==='returning') {moon=this.returnMoon*(1-ease(0,4,time-this.returnAt));if(moon===0){this.state='idle';this.next=time+180+this.random()*120;}}
    const age=time-(this.start??time);
    if(this.state==='breach'&&age>28){this.state='idle';this.next=time+180+this.random()*120;}
    const retreat=Math.max(this.state==='crossing'?ease(0,1.8,time-this.wonAt):ease(21,28,age),this.dismissedAt==null?0:ease(0,1.35,time-this.dismissedAt));
    const pressure=ease(0,7,age)*(1-retreat);
    const threat=pressure*(.88+Math.sin(age*2.7)*.07+Math.sin(age*4.1)*.035);
    const comboActive=this.state==='breach'||(this.state==='crossing'&&this.wonFromBreach);
    const height=Math.max(.68,Math.min(.96,aspect/.96));
    const weights=[0,1,2].map(i=>1-(this.repelled.has(i)?ease(0,1.3,time-this.hitAt[i]):0));
    const recoil=[0,1,2].map(i=>Math.max(retreat,1-weights[i]));
    const approachTimes=[[.55,7.5],[0,6.4],[.35,7.0]];
    const arrival=approachTimes.map(([start,end],i)=>{
      const stop=this.repelled.has(i)?this.hitAt[i]:time;
      const frozen=this.state==='crossing'?Math.min(stop,this.wonAt):stop;
      return ease(start,end,frozen-(this.start??time));
    });
    return {
      active:this.state!=='idle',state:this.state,moon,threat:comboActive?threat:0,retreat,
      combo:{field:[.5,.43,height,comboActive?threat:0],weights,recoil,arrival,id:this.comboId??0,active:comboActive},
    };
  }
}

export class RepulsionTally {
  constructor(threshold=3){this.threshold=threshold;this.reset();}
  reset(){this.events=new Set();this.count=0;}
  register(id){if(!id||this.events.has(id))return false;this.events.add(id);this.count++;return this.count>=this.threshold;}
}
