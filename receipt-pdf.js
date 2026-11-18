/* Documento A4 monocromático, sin firmas y sin precios. */
const A4_W=595.276, A4_H=841.89, LEFT=44, RIGHT=A4_W-44;
const CP1252={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
function pdfSafe(s){
 return String(s??'').normalize('NFC').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim()
  .replace(/[\u0000-\u001f\u007f]/g,'')
  .replace(/[^\x20-\x7e\u00a0-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]/g,'?');
}
function toBytes(s){const bytes=new Uint8Array(s.length);for(let i=0;i<s.length;i++){const ch=s.charCodeAt(i);bytes[i]=ch<=255?ch:(CP1252[ch]??63)}return bytes;}
function quote(s){return '('+pdfSafe(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')+')'}
function len(s){return [...pdfSafe(s)].reduce((n,c)=>n+(c===' '?2.6:/[il.,:;!|']/u.test(c)?2.2:/[WM@%]/u.test(c)?8.5:5.4),0)} // approximate width at 10pt
function wrapText(value,maxWidth,fontSize=10){
 const words=pdfSafe(value).split(' '),lines=[];let current='';const ratio=fontSize/10;
 for(const initial of words){let word=initial;
  if(!word)continue;
  while(word&&len(word)*ratio>maxWidth){
   let part='';while(word.length&&(len(part+word[0])*ratio<=maxWidth||!part)){part+=word[0];word=word.slice(1)}
   if(current){lines.push(current);current=''}lines.push(part);
  }
  if(!word)continue;
  const trial=current?current+' '+word:word;
  if(current&&len(trial)*ratio>maxWidth){lines.push(current);current=word}else current=trial;
 }
 if(current)lines.push(current);return lines.length?lines:[''];
}
function rgb(hex){const v=hex.replace('#','');return [0,2,4].map(i=>(parseInt(v.slice(i,i+2),16)/255).toFixed(3)).join(' ')}
const C={ink:'#151515',muted:'#626262',line:'#D3D3D3',grey:'#F5F5F5',black:'#000000',white:'#FFFFFF'};
function rect(x,y,w,h,color){return `${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`}
function stroke(x1,y1,x2,y2,color,width=1){return `${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`}
function text(str,x,y,size=10,color=C.ink,bold=false){return `${rgb(color)} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${quote(str)} Tj ET\n`}
function metaLabel(k,v,x,y){return text(k.toUpperCase(),x,y,8,C.muted,true)+text(v||'—',x,y-16,11,C.ink,true)}
function printableDate(date){try{return new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'medium',timeStyle:'short'}).format(new Date(date))}catch{return 'Fecha no disponible'}}
function part(n){return `SAL-${String(n).padStart(6,'0')}`}
export const deliveryFolio=part;
export function buildDeliveryPdf(data){
 if(!data||!Array.isArray(data.items)||!data.items.length)throw new Error('Documento de salida sin insumos');
 const folio=part(data.id),pages=[];let buf='',y=0;
 const open=(continuation=false,includeTable=true)=>{
  buf='';
  buf+=text('INSUMOS CENTRAL RETIROS',LEFT,795,12,C.ink,true);
  buf+=text('APROBADA',RIGHT-74,795,9,C.ink,true);
  buf+=stroke(LEFT,782,RIGHT,782,C.ink,1.1);
  if(continuation){
   buf+=text('COMPROBANTE DE SALIDA - CONTINUACIÓN',LEFT,737,14,C.ink,true);
   buf+=text(folio,LEFT,715,11,C.ink,true);
   y=685;
  }else{
   buf+=text('COMPROBANTE DE SALIDA',LEFT,728,19,C.ink,true);
   buf+=stroke(LEFT,712,RIGHT,712,C.line,.7);
   buf+=metaLabel('Folio',folio,LEFT,686);
   buf+=metaLabel('Fecha de aprobación',printableDate(data.approved_at),292,686);
   buf+=metaLabel('Cliente / destino',data.client_name,LEFT,640);
   buf+=metaLabel('Solicitado por',data.requester_name,LEFT,592);
   buf+=metaLabel('Aprobado por',data.approver_name,292,592);
   y=537;
  }
  if(includeTable){
   buf+=stroke(LEFT,y+18,RIGHT,y+18,C.ink,1);
   buf+=text('CÓDIGO',LEFT+10,y+5,9,C.ink,true);
   buf+=text('DESCRIPCIÓN',LEFT+105,y+5,9,C.ink,true);
   buf+=text('CANTIDAD',RIGHT-115,y+5,9,C.ink,true);
   buf+=stroke(LEFT,y-7,RIGHT,y-7,C.ink,.8);
   y-=18;
  }
 };
 const close=()=>{pages.push(buf);buf=''};
 open(false);
 for(const [i,item] of data.items.entries()){
  const code=String(item.code??''),desc=String(item.description??''),quantity=Number(item.quantity)||0,unit=String(item.unit??'');
  const descLines=wrapText(desc,242,9.5),codeLines=wrapText(code,85,9.2),qtyLines=wrapText(`${quantity} ${unit}`,105,9.2);
  const height=Math.max(30,16+Math.max(descLines.length,codeLines.length,qtyLines.length)*13);
  if(y-height<102){close();open(true)}
  // Sin fondos de color: solo separadores ligeros para ahorrar tinta.
  for(let j=0;j<codeLines.length;j++)buf+=text(codeLines[j],LEFT+10,y-j*13,9,C.ink,j===0);
  for(let j=0;j<descLines.length;j++)buf+=text(descLines[j],LEFT+105,y-j*13,9.4,C.ink);
  for(let j=0;j<qtyLines.length;j++)buf+=text(qtyLines[j],RIGHT-115,y-j*13,9,C.ink,j===0);
  y-=height;
  buf+=stroke(LEFT,y+8,RIGHT,y+8,C.line,.6);
 }
 const notes=[['OBSERVACIONES DEL PEDIDO',data.request_note],['OBSERVACIONES DE APROBACIÓN',data.approval_note]].filter(([,v])=>pdfSafe(v));
 if(notes.length){
  if(y<125){close();open(true,false)}
  y-=21;
  for(const [label,value] of notes){
   if(y<108){close();open(true,false);y-=12}
   buf+=text(label,LEFT,y,8,C.muted,true);y-=16;
   for(const line of wrapText(value,RIGHT-LEFT-18,9.5)){
    if(y<85){close();open(true,false);y-=12}
    buf+=text(line,LEFT,y,9.5,C.ink);y-=13;
   }
   y-=9;
  }
 }
 close();
 for(let i=0;i<pages.length;i++){
  pages[i]+=stroke(LEFT,55,RIGHT,55,C.line,.7);
  pages[i]+=text(`Folio ${folio} · Salida aprobada`,LEFT,37,8,C.muted);
  pages[i]+=text(`Pág. ${i+1} de ${pages.length}`,RIGHT-69,37,8,C.muted);
 }
 const objs=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
 const kids=[];
 for(let i=0;i<pages.length;i++){
  const id=objs.length,contentId=id+1;kids.push(`${id} 0 R`);
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
  const bytes=toBytes(pages[i]);objs.push(`<< /Length ${bytes.length} >>\nstream\n${pages[i]}\nendstream`);
 }
 objs[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
 let pdf='%PDF-1.4\n%âãÏÓ\n',offsets=[0];
 for(let i=1;i<objs.length;i++){
  offsets[i]=toBytes(pdf).length;
  pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;
 }
 const start=toBytes(pdf).length;
 pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objs.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
 pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
 return toBytes(pdf);
}
export function downloadDeliveryPdf(data){
 const bytes=buildDeliveryPdf(data);
 const blob=new Blob([bytes],{type:'application/pdf'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`Salida_${deliveryFolio(data.id)}.pdf`;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
