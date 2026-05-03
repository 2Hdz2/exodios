
import { useState, useRef, useCallback } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://exodios-backend.onrender.com";


function DropZone({ label, accept, icon, multiple=false, files, setFiles }) {
  const ref = useRef(); const [drag, setDrag] = useState(false);
  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const f = Array.from(e.dataTransfer.files);
    setFiles(multiple ? f : [f[0]]);
  }, [multiple, setFiles]);
  return (
    <div className={"drop-zone"+(drag?" drag-over":"")}
      onClick={()=>ref.current.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
      <input ref={ref} type="file" accept={accept} multiple={multiple}
        style={{display:"none"}}
        onChange={e=>setFiles(multiple?Array.from(e.target.files):[e.target.files[0]])}/>
      <div className="dz-icon">{icon}</div>
      <div className="dz-label">{label}</div>
      {(!files||files.length===0)
        ? <div className="dz-hint">drag & drop or click to browse</div>
        : <div className="dz-chosen">✓ {multiple?`${files.length} file${files.length!==1?"s":""}`:(files[0]?.name)}</div>}
    </div>
  );
}

function ConfidenceGauge({value, label}) {
  const pct = Math.round(value*100);
  const color = value>=0.75?"#4ade80":value>=0.45?"#f97316":"#f87171";
  const r=44, circ=2*Math.PI*r, dash=circ*value;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <defs><filter id="cglow"><feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)" filter="url(#cglow)"
          style={{transition:"stroke-dasharray 0.8s ease"}}/>
        <text x="55" y="52" textAnchor="middle"
          style={{fill:color,fontSize:20,fontFamily:"'Space Mono',monospace",fontWeight:700}}>
          {pct}%</text>
        <text x="55" y="68" textAnchor="middle"
          style={{fill:"rgba(180,210,255,0.4)",fontSize:9,fontFamily:"'Space Mono',monospace",letterSpacing:1}}>
          CONFIDENCE</text>
      </svg>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,letterSpacing:2,
        textTransform:"uppercase",color,background:`${color}18`,
        border:`1px solid ${color}44`,borderRadius:99,padding:"3px 12px"}}>{label}</span>
    </div>
  );
}

function Badge({source}) {
  const m={both:{c:"#4ade80",l:"⊕ BOTH"},direct:{c:"#00d4ff",l:"◎ DIRECT"},transit:{c:"#a855f7",l:"⌇ TRANSIT"}};
  const s=m[source]||m.direct;
  return <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:1.5,
    textTransform:"uppercase",color:s.c,background:`${s.c}12`,border:`1px solid ${s.c}35`,
    borderRadius:99,padding:"3px 9px",whiteSpace:"nowrap"}}>{s.l}</span>;
}

function XVal() {
  return <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:1.5,
    textTransform:"uppercase",color:"#4ade80",background:"#4ade8010",
    border:"1px solid #4ade8050",borderRadius:99,padding:"3px 9px",
    boxShadow:"0 0 8px #4ade8030"}}>✓ CROSS-VALIDATED</span>;
}

function Bar({label, value, color}) {
  if(value==null) return null;
  const pct=Math.round(value*100);
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,
        fontFamily:"'Space Mono',monospace",fontSize:10}}>
        <span style={{color:"rgba(180,210,255,0.5)",letterSpacing:1}}>{label}</span>
        <span style={{color}}>{pct}%</span>
      </div>
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:99,height:4,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",borderRadius:99,background:color,
          transition:"width 0.6s ease",boxShadow:`0 0 6px ${color}88`}}/>
      </div>
    </div>
  );
}

function Field({label,value}) {
  return (
    <div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:1.5,
        color:"rgba(180,210,255,0.35)",textTransform:"uppercase",marginBottom:3}}>{label}</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"#c0d8f0"}}>{value}</div>
    </div>
  );
}

function CandidateRow({cand, rank}) {
  const [open, setOpen] = useState(false);
  const conf=cand.confidence;
  const color=conf>=0.75?"#4ade80":conf>=0.45?"#f97316":"#f87171";
  return (
    <div style={{background:"rgba(255,255,255,0.02)",
      border:`1px solid ${cand.cross_validated?"#4ade8030":"rgba(255,255,255,0.06)"}`,
      borderRadius:10,marginBottom:8,overflow:"hidden",
      boxShadow:cand.cross_validated?"0 0 16px #4ade8012":"none"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"12px 16px",display:"flex",
        alignItems:"center",gap:12,cursor:"pointer"}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:`${color}20`,
          border:`1px solid ${color}50`,display:"flex",alignItems:"center",
          justifyContent:"center",fontFamily:"'Space Mono',monospace",
          fontSize:11,color,flexShrink:0}}>#{rank}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
          <Badge source={cand.source}/>
          {cand.cross_validated&&<XVal/>}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color}}>
            {Math.round(conf*100)}%</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,
            color:"rgba(180,210,255,0.35)",letterSpacing:1}}>{cand.confidence_label}</div>
        </div>
        <div style={{color:"rgba(180,210,255,0.3)",fontSize:10,
          fontFamily:"'Space Mono',monospace",flexShrink:0}}>{open?"▲":"▼"}</div>
      </div>
      {open&&(
        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"14px 16px",
          display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 24px"}}>
          <div style={{gridColumn:"1/-1",marginBottom:6}}>
            <Bar label="DIRECT IMAGING SCORE" value={cand.direct_score}  color="#00d4ff"/>
            <Bar label="TRANSIT (BLS×LSTM)"   value={cand.transit_score} color="#a855f7"/>
            <Bar label="RF CLASSIFIER SCORE"  value={cand.rf_score}      color="#f97316"/>
          </div>
          {cand.snr!=null&&<Field label="PEAK SNR"  value={cand.snr.toFixed(2)}/>}
          {cand.sep_pix!=null&&<Field label="SEP (px)" value={cand.sep_pix.toFixed(1)}/>}
          {cand.sep_mas!=null&&<Field label="SEP (mas)" value={cand.sep_mas.toFixed(1)}/>}
          {cand.frame!=null&&<Field label="FRAME" value={cand.frame}/>}
          {cand.period!=null&&<Field label="PERIOD" value={`${cand.period.toFixed(4)} d`}/>}
          {cand.depth!=null&&<Field label="DEPTH" value={cand.depth.toExponential(3)}/>}
          {cand.duration!=null&&<Field label="DURATION" value={`${cand.duration.toFixed(3)} d`}/>}
          {cand.bls_power!=null&&<Field label="BLS POWER" value={cand.bls_power.toFixed(2)}/>}
          {cand.lstm_prob!=null&&<Field label="LSTM PROB" value={`${Math.round(cand.lstm_prob*100)}%`}/>}
          {cand.rf_score!=null&&<Field label="RF PROB" value={`${Math.round(cand.rf_score*100)}%`}/>}
        </div>
      )}
    </div>
  );
}

function AIReport({report}) {
  if(!report) return null;
  const ok = report.ai_available;
  return (
    <div className="card" style={{borderColor:ok?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.07)",marginTop:0}}>
      <h3>
        <span style={{color:"#4ade80"}}>◈</span> AI DETECTION REPORT
        {!ok&&<span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
          color:"rgba(180,210,255,0.3)",marginLeft:10}}>
          (set ANTHROPIC_API_KEY to enable)</span>}
      </h3>
      {ok?(
        <>
          <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",
            borderRadius:10,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
              color:"#4ade80",marginBottom:8}}>VERDICT</div>
            <div style={{fontSize:14,color:"#e0f0ff",lineHeight:1.6}}>{report.verdict}</div>
          </div>
          {report.interpretation&&(
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
                color:"rgba(180,210,255,0.4)",marginBottom:8}}>SCIENTIFIC INTERPRETATION</div>
              <div style={{fontSize:13,color:"rgba(224,240,255,0.8)",lineHeight:1.7}}>
                {report.interpretation}</div>
            </div>
          )}
          {report.candidates_summary?.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
                color:"rgba(180,210,255,0.4)",marginBottom:8}}>CANDIDATE ASSESSMENTS</div>
              {report.candidates_summary.map((c,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",
                  border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,
                  padding:"10px 14px",marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,
                    color:"#a855f7",flexShrink:0}}>#{c.rank}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:"#c0d8f0",marginBottom:4}}>{c.assessment}</div>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:1,
                      color:"#f97316",background:"rgba(249,115,22,0.1)",
                      border:"1px solid rgba(249,115,22,0.3)",borderRadius:99,
                      padding:"2px 8px"}}>{c.planet_type_hint}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {report.reliability_note&&(
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",
                borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
                  color:"rgba(180,210,255,0.4)",marginBottom:6}}>RELIABILITY</div>
                <div style={{fontSize:12,color:"rgba(224,240,255,0.7)",lineHeight:1.6}}>
                  {report.reliability_note}</div>
              </div>
            )}
            {report.recommended_followup&&(
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",
                borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
                  color:"rgba(180,210,255,0.4)",marginBottom:6}}>RECOMMENDED FOLLOWUP</div>
                <div style={{fontSize:12,color:"rgba(224,240,255,0.7)",lineHeight:1.6}}>
                  {report.recommended_followup}</div>
              </div>
            )}
          </div>
        </>
      ):(
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,
          color:"rgba(180,210,255,0.4)",padding:"12px 0"}}>{report.verdict}</div>
      )}
    </div>
  );
}

function AILayers({layers}) {
  if(!layers) return null;
  const items=[
    {key:"lstm",  label:"LSTM Neural Net",  color:"#a855f7", desc:"Transit probability"},
    {key:"rf",    label:"Random Forest",     color:"#f97316", desc:"Planet classifier"},
    {key:"claude",label:"Claude API",        color:"#4ade80", desc:"Detection report"},
  ];
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {items.map(({key,label,color,desc})=>{
        const active=layers[key];
        return (
          <div key={key} style={{background:active?`${color}0f`:"rgba(255,255,255,0.02)",
            border:`1px solid ${active?color+"40":"rgba(255,255,255,0.07)"}`,
            borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:6,height:6,borderRadius:"50%",
              background:active?color:"rgba(255,255,255,0.2)",
              boxShadow:active?`0 0 6px ${color}`:"none"}}/>
            <div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,
                color:active?color:"rgba(180,210,255,0.3)",letterSpacing:1}}>{label}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,
                color:"rgba(180,210,255,0.3)"}}>{desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({label,value,color="#00d4ff",sub}) {
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:12,padding:"14px 18px"}}>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
        textTransform:"uppercase",color:"rgba(180,210,255,0.4)",marginBottom:8}}>{label}</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:22,fontWeight:700,color}}>{value}</div>
      {sub&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:10,
        color:"rgba(180,210,255,0.35)",marginTop:4}}>{sub}</div>}
    </div>
  );
}

export default function HybridView() {
  const [fitsFiles, setFitsFiles] = useState([]);
  const [lcFiles,   setLcFiles]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState("");
  const [error,     setError]     = useState(null);
  const [result,    setResult]    = useState(null);
  const [filter,    setFilter]    = useState("all");

  const hasFits=fitsFiles.length>0, hasLc=lcFiles.length>0;
  const canRun=(hasFits||hasLc)&&!loading;

  const run = async () => {
    setLoading(true); setError(null); setResult(null); setStep("Uploading…");
    try {
      const fd=new FormData();
      fitsFiles.forEach(f=>fd.append("fits_files",f));
      if(lcFiles[0]) fd.append("lc_file",lcFiles[0]);
      fd.append("params","{}");
      setStep("Running hybrid pipeline…");
      const res=await fetch(`${API}/api/hybrid/detect`,{method:"POST",body:fd});
      if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.detail||`HTTP ${res.status}`);}
      setStep("Generating AI report…");
      setResult(await res.json());
    } catch(e){ setError(e.message); }
    finally{ setLoading(false); setStep(""); }
  };

  const cands   = result?.hybrid?.candidates ?? [];
  const summary = result?.hybrid?.summary;
  const report  = result?.hybrid?.ai_report;

  const shown = cands.filter(c=>{
    if(filter==="all")    return true;
    if(filter==="xval")   return c.cross_validated;
    return c.source===filter;
  });

  return (
    <div>
      {error&&(
        <div className="error-backdrop" onClick={()=>setError(null)}>
          <div className="error-dialog" onClick={e=>e.stopPropagation()}>
            <div className="error-title">⚠ Hybrid Pipeline Error</div>
            <div className="error-msg">{error}</div>
            <button className="btn btn-sm" onClick={()=>setError(null)}>DISMISS</button>
          </div>
        </div>
      )}

      <div className="page-title">⊕ HYBRID DETECTION FRAMEWORK</div>
      <div className="page-sub">Direct imaging · Transit photometry · LSTM · Random Forest · Claude AI report</div>

      {/* How it works */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[
            {icon:"◎",color:"#00d4ff",title:"Direct Imaging",desc:"SNR-mapped coronagraphic FITS → matched-filter + likelihood-ratio candidate detection"},
            {icon:"⌇",color:"#a855f7",title:"Transit + LSTM + RF",desc:"BLS period search · LSTM neural net transit probability · Random Forest planet classifier"},
            {icon:"◈",color:"#4ade80",title:"Claude AI Report",desc:"Probabilistic OR fusion · cross-validation · natural language scientific interpretation"},
          ].map(({icon,color,title,desc})=>(
            <div key={title} style={{background:`${color}08`,border:`1px solid ${color}20`,
              borderRadius:10,padding:16}}>
              <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
              <div style={{fontWeight:700,fontSize:13,color,marginBottom:6,letterSpacing:1}}>{title}</div>
              <div style={{fontSize:11,color:"rgba(180,210,255,0.5)",lineHeight:1.6}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:16}}>
        <div className="card card-blue">
          <h3><span className="text-cyan">◎</span> DIRECT IMAGING
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
              color:"rgba(180,210,255,0.3)",marginLeft:10}}>OPTIONAL</span></h3>
          <DropZone label="FITS files" accept=".fits,.fit,.fts" icon="🔭"
            multiple files={fitsFiles} setFiles={setFitsFiles}/>
        </div>
        <div className="card card-purple">
          <h3><span className="text-purple">⌇</span> TRANSIT PHOTOMETRY
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,
              color:"rgba(180,210,255,0.3)",marginLeft:10}}>OPTIONAL</span></h3>
          <DropZone label="Light curve (.tbl · .fits · .csv)" accept=".fits,.fit,.tbl,.csv"
            icon="📈" multiple={false} files={lcFiles} setFiles={setLcFiles}/>
        </div>
      </div>

      {(hasFits||hasLc)&&(
        <div style={{padding:"10px 16px",marginBottom:16,
          background:hasFits&&hasLc?"rgba(74,222,128,0.06)":"rgba(255,255,255,0.03)",
          border:`1px solid ${hasFits&&hasLc?"rgba(74,222,128,0.25)":"rgba(255,255,255,0.07)"}`,
          borderRadius:10,fontFamily:"'Space Mono',monospace",fontSize:11,
          color:hasFits&&hasLc?"#4ade80":"#00d4ff"}}>
          {hasFits&&hasLc?"⊕ FULL HYBRID — both arms active, cross-validation + AI report enabled"
            :hasFits?"◎ DIRECT IMAGING only — add a light curve to enable cross-validation"
            :"⌇ TRANSIT + LSTM + RF only — add FITS files to enable cross-validation"}
        </div>
      )}

      <button className="btn btn-primary" style={{width:"100%",marginBottom:24}}
        disabled={!canRun} onClick={run}>
        {loading?`◌ ${step||"RUNNING…"}`:"▶ RUN HYBRID DETECTION"}
      </button>

      {loading&&(
        <div className="loading-overlay" style={{marginTop:20}}>
          <div className="loading-spinner">
            <div className="spinner-ring"/>
            <span>{step||"Running…"}</span>
          </div>
        </div>
      )}

      {result&&summary&&(
        <>
          {/* AI layers indicator */}
          <AILayers layers={summary.ai_layers_active}/>

          {/* Confidence + stats */}
          <div className="card" style={{borderColor:summary.cross_validated>0
            ?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.07)",marginBottom:20}}>
            <div style={{display:"flex",gap:32,flexWrap:"wrap",alignItems:"center"}}>
              <ConfidenceGauge value={summary.system_confidence} label={summary.confidence_label}/>
              <div style={{flex:1,display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12}}>
                <StatCard label="Total"          value={summary.total_candidates} color="#00d4ff"/>
                <StatCard label="Cross-Validated" value={summary.cross_validated} color="#4ade80"
                  sub={summary.cross_validated>0?"both arms":"none"}/>
                <StatCard label="Direct Only"    value={summary.direct_only}  color="#00d4ff"/>
                <StatCard label="Transit Only"   value={summary.transit_only} color="#a855f7"/>
                <StatCard label="Both Arms"      value={summary.both_arms}    color="#4ade80"/>
                {summary.top_period!=null&&<StatCard label="Top Period"
                  value={`${summary.top_period.toFixed(3)}d`} color="#a855f7"/>}
                {summary.peak_direct_snr!=null&&<StatCard label="Peak SNR"
                  value={summary.peak_direct_snr.toFixed(1)} color="#00d4ff"/>}
                {summary.top_lstm_prob!=null&&<StatCard label="LSTM Prob"
                  value={`${Math.round(summary.top_lstm_prob*100)}%`} color="#a855f7"/>}
              </div>
            </div>
          </div>

          {/* AI Report */}
          <AIReport report={report}/>

          {/* Candidate list */}
          <div className="card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              marginBottom:16,flexWrap:"wrap",gap:10}}>
              <h3 style={{margin:0}}>UNIFIED CANDIDATE LIST</h3>
              <div style={{display:"flex",gap:5}}>
                {[["all","ALL"],["both","⊕ BOTH"],["direct","◎ DIRECT"],
                  ["transit","⌇ TRANSIT"],["xval","✓ XVAL"]].map(([k,l])=>(
                  <button key={k} className={"view-tab"+(filter===k?" active":"")}
                    onClick={()=>setFilter(k)}>{l}</button>
                ))}
              </div>
            </div>
            {shown.length===0
              ? <div style={{textAlign:"center",padding:"40px 0",
                  fontFamily:"'Space Mono',monospace",fontSize:12,
                  color:"rgba(180,210,255,0.25)"}}>No candidates match this filter</div>
              : shown.map((c,i)=><CandidateRow key={c.id} cand={c} rank={i+1}/>)
            }
          </div>

          {/* Score method */}
          <div className="card" style={{marginTop:0}}>
            <h3>SCORING METHOD</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {[
                {label:"Direct Score",color:"#00d4ff",formula:"clip(SNR ÷ 15, 0, 1)",note:"Saturates at SNR = 15"},
                {label:"Transit Score",color:"#a855f7",formula:"clip(BLS ÷ 500, 0, 1) × LSTM",note:"BLS power × neural probability"},
                {label:"RF Score",color:"#f97316",formula:"RF.predict_proba(period,depth,…)",note:"Trained KOI catalogue classifier"},
                {label:"Fused (both)",color:"#4ade80",formula:"1 − (1−D) × (1−T)",note:"Probabilistic OR"},
                {label:"Final",color:"#e0f0ff",formula:"0.5 × fused + 0.5 × RF",note:"When RF model is available"},
                {label:"Claude Report",color:"#4ade80",formula:"Anthropic API",note:"Scientific NL interpretation"},
              ].map(({label,color,formula,note})=>(
                <div key={label} style={{background:`${color}08`,border:`1px solid ${color}20`,
                  borderRadius:10,padding:14}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,
                    color,letterSpacing:1.5,marginBottom:8}}>{label}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#c0d8f0",
                    background:"rgba(0,0,0,0.3)",borderRadius:6,padding:"6px 10px",marginBottom:8}}>
                    {formula}</div>
                  <div style={{fontSize:11,color:"rgba(180,210,255,0.4)"}}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}