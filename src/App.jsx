import { useState, useEffect } from "react";

const ROI_DATA = {
  kitchen: { label: "Kitchen Cabinets/Remodel", roi: 0.67 },
  flooring: { label: "Flooring", roi: 0.72 },
  bathroom: { label: "Bathroom Remodel", roi: 0.60 },
  appliances: { label: "Appliances (Dishwasher, Stove, etc.)", roi: 0.50 },
  countertops: { label: "Countertops", roi: 0.63 },
  roofing: { label: "Roofing", roi: 0.61 },
  windows: { label: "Windows/Doors", roi: 0.68 },
  siding: { label: "Siding", roi: 0.76 },
  hvac: { label: "HVAC System", roi: 0.58 },
  landscaping: { label: "Landscaping", roi: 0.55 },
  other: { label: "Other", roi: 0.50 },
};

const INITIAL_ITEMS = [
  { id: 1, qty: 1, description: 'Drawer Base Cabinet 18"', height: 34.5, width: 18, depth: 24, price: 179, link: "https://www.homedepot.com/p/302970336", location: "Vallejo 19/14", category: "kitchen" },
  { id: 2, qty: 2, description: 'Corner Lazy Susan Cabinet 32"', height: 34.5, width: 32, depth: 21, price: 264, link: "https://www.homedepot.com/p/330823312", location: "Ship to Vallejo?", category: "kitchen" },
  { id: 3, qty: 1, description: 'Sink Base Cabinet 30"', height: 34.5, width: 30, depth: 24, price: 139, link: "https://www.homedepot.com/p/330823335", location: "", category: "kitchen" },
  { id: 4, qty: 1, description: 'Base Cabinet 36"', height: 34.5, width: 36, depth: 24, price: 169, link: "https://www.homedepot.com/p/330823153", location: "", category: "kitchen" },
  { id: 5, qty: 1, description: "Corner Diagonal Wall Cabinet", height: 36, width: 12, depth: 24, price: 140, link: "https://www.homedepot.com/p/330823489", location: "", category: "kitchen" },
  { id: 6, qty: 1, description: 'Wall Cabinet 24"x36"', height: 36, width: 12, depth: 24, price: 118, link: "https://www.homedepot.com/p/330823673", location: "", category: "kitchen" },
];

const EMPTY_ITEM = { qty: 1, description: "", height: "", width: "", depth: "", price: "", link: "", location: "", category: "kitchen" };
const EMPTY_SQFT = { description: "", costPerSqFt: "", roomLength: "", roomWidth: "", wasteBuffer: 10, link: "", category: "flooring" };

function encodeProject(projectName, items, sqftItems, propertyValue) {
  try {
    return btoa(encodeURIComponent(JSON.stringify({ projectName, items, sqftItems, propertyValue })));
  } catch { return null; }
}

function decodeProject(encoded) {
  try { return JSON.parse(decodeURIComponent(atob(encoded))); }
  catch { return null; }
}

export default function AllyTracker() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [propertyValue, setPropertyValue] = useState(450000);
  const [view, setView] = useState("tracker");
  const [sqftItems, setSqftItems] = useState([]);
  const [newSqft, setNewSqft] = useState(EMPTY_SQFT);
  const [sqftNextId, setSqftNextId] = useState(200);
  const [shareMethod, setShareMethod] = useState("link");
  const [shareEmail, setShareEmail] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [nextId, setNextId] = useState(100);
  const [shareMsg, setShareMsg] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [projects, setProjects] = useState([{ id: 1, name: "Vallejo Kitchen Remodel" }]);
  const [activeProjectId, setActiveProjectId] = useState(1);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectNextId, setProjectNextId] = useState(2);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("project");
      if (shared) {
        const data = decodeProject(shared);
        if (data) {
          setItems(data.items || []);
          setSqftItems(data.sqftItems || []);
          setPropertyValue(data.propertyValue || 450000);
          setProjects([{ id: 1, name: data.projectName || "Shared Project" }]);
          setActiveProjectId(1);
          setIsReadOnly(true);
        }
      }
    } catch {}
  }, []);

  const totalSpent = items.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
  const roiByCategory = Object.entries(
    items.reduce((acc, item) => {
      const cost = Number(item.price) * Number(item.qty);
      acc[item.category] = (acc[item.category] || 0) + cost;
      return acc;
    }, {})
  ).map(([cat, cost]) => ({
    cat, label: ROI_DATA[cat]?.label || cat, cost,
    roiPct: ROI_DATA[cat]?.roi || 0.5,
    valueAdded: cost * (ROI_DATA[cat]?.roi || 0.5),
  }));
  const totalValueAdded = roiByCategory.reduce((s, r) => s + r.valueAdded, 0);
  const newPropertyValue = propertyValue + totalValueAdded;
  const netROI = totalSpent > 0 ? ((totalValueAdded / totalSpent) * 100).toFixed(1) : 0;

  const addProject = () => {
    if (!newProjectName.trim()) return;
    const np = { id: projectNextId, name: newProjectName.trim() };
    setProjects([...projects, np]);
    setActiveProjectId(projectNextId);
    setProjectNextId(projectNextId + 1);
    setItems([]); setSqftItems([]);
    setNewProjectName(""); setShowNewProject(false);
  };

  const addSqftItem = () => {
    if (!newSqft.description || !newSqft.costPerSqFt || !newSqft.roomLength || !newSqft.roomWidth) return;
    const rawSqFt = Number(newSqft.roomLength) * Number(newSqft.roomWidth);
    const withWaste = rawSqFt * (1 + Number(newSqft.wasteBuffer) / 100);
    const totalCost = withWaste * Number(newSqft.costPerSqFt);
    setSqftItems([...sqftItems, { ...newSqft, id: sqftNextId, rawSqFt, withWaste, totalCost }]);
    setSqftNextId(sqftNextId + 1);
    setNewSqft(EMPTY_SQFT);
  };

  const addSqftToTracker = (item) => {
    setItems([...items, {
      id: nextId, qty: 1,
      description: `${item.description} (${item.withWaste.toFixed(1)} sq ft)`,
      height: "", width: item.roomWidth, depth: item.roomLength,
      price: Math.ceil(item.totalCost), link: item.link, location: "", category: item.category
    }]);
    setNextId(nextId + 1);
  };

  const addItem = () => {
    if (!newItem.description || !newItem.price) return;
    setItems([...items, { ...newItem, id: nextId }]);
    setNextId(nextId + 1);
    setNewItem(EMPTY_ITEM);
  };

  const deleteItem = (id) => setItems(items.filter(i => i.id !== id));

  const generateShareLink = () => {
    const encoded = encodeProject(activeProject?.name, items, sqftItems, propertyValue);
    const base = window.location.href.split("?")[0];
    const link = `${base}?project=${encoded}`;
    setGeneratedLink(link);
    return link;
  };

  const buildShareText = (link = "") => {
    const lines = [
      "ALLY'S TRACKER — PROJECT SUMMARY",
      `Project: ${activeProject?.name || "Untitled"}`,
      "================================",
      `Total Materials Cost: $${totalSpent.toLocaleString()}`,
      `Estimated Value Added: $${totalValueAdded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `Projected Property Value: $${newPropertyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `Overall ROI: ${netROI}%`,
      "",
      "ITEMS:",
      ...items.map(i => `- ${i.qty}x ${i.description} — $${(Number(i.price) * Number(i.qty)).toLocaleString()}`),
      ...(link ? ["", "View full interactive project:", link] : []),
    ];
    return lines.join("\n");
  };

  const handleShare = () => {
    const link = generateShareLink();
    const text = buildShareText(link);
    if (shareMethod === "email") {
      window.open(`mailto:${shareEmail}?subject=${encodeURIComponent("Ally's Tracker — " + (activeProject?.name || "Project"))}&body=${encodeURIComponent(text)}`);
      setShareMsg("Email client opened! The link lets them see the full app.");
    } else if (shareMethod === "sms") {
      window.open(`sms:${sharePhone}?body=${encodeURIComponent(text)}`);
      setShareMsg("Messages app opened!");
    } else {
      navigator.clipboard?.writeText(link).then(() => setShareMsg("Link copied to clipboard!")).catch(() => setShareMsg("Link generated — copy it below!"));
    }
  };

  const btn = (active) => ({
    padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
    background: active ? "#f5c842" : "#222", color: active ? "#111" : "#888", transition: "all 0.15s"
  });

  const inp = { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", minHeight: "100vh", background: "#0f0f0f", color: "#e5e5e5" }}>

      {isReadOnly && (
        <div style={{ background: "#1a2a3a", borderBottom: "1px solid #2a4a6a", padding: "10px 20px", textAlign: "center" }}>
          <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13 }}>You are viewing a shared project (read-only)</span>
        </div>
      )}

      <div style={{ background: "linear-gradient(135deg,#1a1a1a,#111)", borderBottom: "1px solid #2a2a2a", padding: "24px 20px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>🔨</span>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f5c842", letterSpacing: "-0.5px", margin: 0 }}>ALLY'S TRACKER</h1>
              <p style={{ fontSize: 11, color: "#666", margin: 0, letterSpacing: 2 }}>MATERIALS · SPENDING · ROI</p>
            </div>
          </div>

          {!isReadOnly && (
            <div style={{ marginTop: 14, marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: 1, marginBottom: 6 }}>PROJECT</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {projects.map(p => (
                  <button key={p.id} onClick={() => { setActiveProjectId(p.id); setView("tracker"); }} style={btn(activeProjectId === p.id)}>{p.name}</button>
                ))}
                {showNewProject ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input autoFocus type="text" placeholder="Project name..." value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addProject()}
                      style={{ background: "#111", border: "1px solid #f5c842", borderRadius: 20, padding: "5px 12px", color: "#fff", fontSize: 12, outline: "none", width: 160 }} />
                    <button onClick={addProject} style={{ background: "#f5c842", color: "#111", border: "none", borderRadius: 20, padding: "5px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>OK</button>
                    <button onClick={() => setShowNewProject(false)} style={{ background: "#222", color: "#888", border: "none", borderRadius: 20, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>X</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewProject(true)} style={{ padding: "5px 12px", borderRadius: 20, border: "1px dashed #444", background: "none", color: "#888", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>+ New Project</button>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {[
              { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, color: "#f5c842" },
              { label: "Value Added", value: `$${totalValueAdded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "#4ade80" },
              { label: "ROI", value: `${netROI}%`, color: "#60a5fa" },
              { label: "New Est. Value", value: `$${newPropertyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "#c084fc" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 10, padding: "6px 14px" }}>
                <div style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            {[["tracker","Tracker"],["sqft","Sq Ft Calc"],["roi","ROI"],["share","Share"]].map(([t, label]) => (
              <button key={t} onClick={() => setView(t)} style={btn(view === t)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {view === "tracker" && (
          <div>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>📁</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{activeProject?.name}</span>
              <span style={{ fontSize: 11, color: "#555", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "2px 10px" }}>{items.length} items</span>
            </div>

            {!isReadOnly && (
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f5c842", letterSpacing: 2, marginBottom: 14, marginTop: 0 }}>+ ADD MATERIAL</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
                  {[["Description","description","text","Cabinet, Flooring..."],["Qty","qty","number","1"],["Price ($)","price","number","0.00"],["Height","height","number","34.5"],["Width","width","number","24"],["Depth","depth","number","24"],["Location/Notes","location","text","Room or address"]].map(([label,field,type,ph]) => (
                    <div key={field}>
                      <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>{label.toUpperCase()}</label>
                      <input type={type} placeholder={ph} value={newItem[field]} onChange={e => setNewItem({ ...newItem, [field]: e.target.value })} style={inp} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>CATEGORY</label>
                    <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} style={inp}>
                      {Object.entries(ROI_DATA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>PRODUCT LINK</label>
                  <input type="text" placeholder="https://homedepot.com/..." value={newItem.link} onChange={e => setNewItem({ ...newItem, link: e.target.value })} style={inp} />
                </div>
                <button onClick={addItem} style={{ marginTop: 14, background: "#f5c842", color: "#111", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>ADD ITEM</button>
              </div>
            )}

            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f5c842", letterSpacing: 2, margin: 0 }}>MATERIALS ({items.length})</h2>
                <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>Total: ${totalSpent.toLocaleString()}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#111" }}>
                      {["Qty","Description","H x W x D","Category","Price","Subtotal","Location","Link",...(!isReadOnly ? [""] : [])].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#666", fontWeight: 700, fontSize: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #222", background: idx % 2 === 0 ? "#1a1a1a" : "#161616" }}>
                        <td style={{ padding: "10px 12px", color: "#aaa" }}>{item.qty}</td>
                        <td style={{ padding: "10px 12px", color: "#fff", fontWeight: 600 }}>{item.description}</td>
                        <td style={{ padding: "10px 12px", color: "#888", whiteSpace: "nowrap" }}>{item.height}x{item.width}x{item.depth}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: "#222", color: "#f5c842", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{ROI_DATA[item.category]?.label?.split(" ")[0] || item.category}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#fff" }}>${Number(item.price).toLocaleString()}</td>
                        <td style={{ padding: "10px 12px", color: "#4ade80", fontWeight: 700 }}>${(Number(item.price)*Number(item.qty)).toLocaleString()}</td>
                        <td style={{ padding: "10px 12px", color: "#888" }}>{item.location || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{item.link ? <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: 11 }}>View</a> : "—"}</td>
                        {!isReadOnly && <td style={{ padding: "10px 12px" }}><button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>X</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === "sqft" && (
          <div>
            {!isReadOnly && (
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f5c842", letterSpacing: 2, marginBottom: 4, marginTop: 0 }}>SQUARE FOOTAGE CALCULATOR</h2>
                <p style={{ fontSize: 12, color: "#666", marginBottom: 16, marginTop: 0 }}>Enter material price per sq ft and room dimensions.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                  {[["Material Name","description","text","Hardwood Flooring"],["Cost Per Sq Ft ($)","costPerSqFt","number","4.99"],["Room Length (ft)","roomLength","number","12"],["Room Width (ft)","roomWidth","number","10"],["Waste Buffer (%)","wasteBuffer","number","10"]].map(([label,field,type,ph]) => (
                    <div key={field}>
                      <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>{label.toUpperCase()}</label>
                      <input type={type} placeholder={ph} value={newSqft[field]} onChange={e => setNewSqft({ ...newSqft, [field]: e.target.value })} style={inp} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>CATEGORY</label>
                    <select value={newSqft.category} onChange={e => setNewSqft({ ...newSqft, category: e.target.value })} style={inp}>
                      {Object.entries(ROI_DATA).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>PRODUCT LINK (OPTIONAL)</label>
                  <input type="text" placeholder="https://homedepot.com/..." value={newSqft.link} onChange={e => setNewSqft({ ...newSqft, link: e.target.value })} style={inp} />
                </div>
                {newSqft.costPerSqFt && newSqft.roomLength && newSqft.roomWidth && (
                  <div style={{ marginTop: 16, background: "#111", border: "1px solid #333", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, marginBottom: 10 }}>LIVE ESTIMATE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        ["Room Size", `${(Number(newSqft.roomLength)*Number(newSqft.roomWidth)).toFixed(1)} sq ft`],
                        [`With Waste (+${newSqft.wasteBuffer}%)`, `${(Number(newSqft.roomLength)*Number(newSqft.roomWidth)*(1+Number(newSqft.wasteBuffer)/100)).toFixed(1)} sq ft`],
                        ["Total Cost", `$${(Number(newSqft.roomLength)*Number(newSqft.roomWidth)*(1+Number(newSqft.wasteBuffer)/100)*Number(newSqft.costPerSqFt)).toLocaleString(undefined,{maximumFractionDigits:2})}`],
                      ].map(([label,val]) => (
                        <div key={label} style={{ background: "#1a1a1a", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#f5c842", marginTop: 2 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={addSqftItem} style={{ marginTop: 14, background: "#f5c842", color: "#111", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>CALCULATE & SAVE</button>
              </div>
            )}
            {sqftItems.length > 0 ? (
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #2a2a2a" }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f5c842", letterSpacing: 2, margin: 0 }}>SAVED CALCULATIONS ({sqftItems.length})</h2>
                </div>
                {sqftItems.map((item, idx) => (
                  <div key={item.id} style={{ padding: "16px 18px", borderBottom: "1px solid #222", background: idx % 2 === 0 ? "#1a1a1a" : "#161616" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{item.description}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{item.roomLength} ft x {item.roomWidth} ft = {item.rawSqFt.toFixed(1)} sq ft</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>+{item.wasteBuffer}% waste = <strong style={{ color: "#f5c842" }}>{item.withWaste.toFixed(1)} sq ft needed</strong></div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>${Number(item.costPerSqFt).toFixed(2)}/sq ft</div>
                        {item.link && <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#60a5fa", display: "inline-block", marginTop: 4 }}>Product Link</a>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>${item.totalCost.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                        <div style={{ fontSize: 10, color: "#888", marginBottom: 8 }}>TOTAL COST</div>
                        {!isReadOnly && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => addSqftToTracker(item)} style={{ background: "#1e3a1e", border: "1px solid #4ade80", color: "#4ade80", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ ADD TO TRACKER</button>
                            <button onClick={() => setSqftItems(sqftItems.filter(i => i.id !== item.id))} style={{ background: "none", border: "1px solid #333", color: "#ef4444", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer" }}>X</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#444" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📐</div>
                <div>No calculations yet.</div>
              </div>
            )}
          </div>
        )}

        {view === "roi" && (
          <div>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f5c842", letterSpacing: 2, marginBottom: 14, marginTop: 0 }}>PROPERTY DETAILS</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 4 }}>CURRENT PROPERTY VALUE ($)</label>
                  <input type="number" value={propertyValue} onChange={e => setPropertyValue(Number(e.target.value))} disabled={isReadOnly}
                    style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#f5c842", fontSize: 18, fontWeight: 800, width: 200, boxSizing: "border-box" }} />
                </div>
                <div style={{ marginTop: 18, color: "#666", fontSize: 20 }}>to</div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 10, color: "#888", letterSpacing: 1, marginBottom: 4 }}>PROJECTED VALUE</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>${newPropertyValue.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {roiByCategory.map(r => (
                <div key={r.cat} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff" }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Industry avg ROI: {(r.roiPct*100).toFixed(0)}%</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#f5c842", fontWeight: 800 }}>${r.cost.toLocaleString()} spent</div>
                      <div style={{ color: "#4ade80", fontSize: 12 }}>+${r.valueAdded.toLocaleString(undefined,{maximumFractionDigits:0})} added</div>
                    </div>
                  </div>
                  <div style={{ background: "#111", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ background: "linear-gradient(90deg,#f5c842,#4ade80)", height: "100%", width: `${r.roiPct*100}%`, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "linear-gradient(135deg,#1a2a1a,#1a1a2a)", border: "1px solid #333", borderRadius: 14, padding: 20, marginTop: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f5c842", fontSize: 13, letterSpacing: 2 }}>SUMMARY</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[["Total Invested",`$${totalSpent.toLocaleString()}`],["Est. Value Added",`$${totalValueAdded.toLocaleString(undefined,{maximumFractionDigits:0})}`],["Net ROI",`${netROI}%`],["Projected Sale Price",`$${newPropertyValue.toLocaleString(undefined,{maximumFractionDigits:0})}`]].map(([label,val]) => (
                  <div key={label} style={{ background: "#111", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 4 }}>{val}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#555", marginTop: 14, marginBottom: 0 }}>ROI estimates based on national averages. Actual returns vary by market.</p>
            </div>
          </div>
        )}

        {view === "share" && (
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f5c842", letterSpacing: 2, marginBottom: 6, marginTop: 0 }}>SHARE PROJECT</h2>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 18, marginTop: 0 }}>The recipient sees the full interactive app — no account needed.</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[["link","Copy Link"],["email","Email"],["sms","SMS"]].map(([m,label]) => (
                <button key={m} onClick={() => setShareMethod(m)} style={{ padding: "8px 20px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: shareMethod === m ? "#f5c842" : "#222", color: shareMethod === m ? "#111" : "#888" }}>{label}</button>
              ))}
            </div>

            {shareMethod === "email" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>RECIPIENT EMAIL</label>
                <input type="email" placeholder="contractor@example.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                  style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            )}
            {shareMethod === "sms" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>PHONE NUMBER</label>
                <input type="tel" placeholder="+1 (555) 000-0000" value={sharePhone} onChange={e => setSharePhone(e.target.value)}
                  style={{ width: "100%", background: "#111", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            )}

            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: 1, marginBottom: 8 }}>WHAT THEY GET</div>
              <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
                No app or account needed to view<br/>
                Full project with materials, costs and ROI<br/>
                All tabs work just like yours<br/>
                Read-only so your data stays safe
              </div>
            </div>

            <button onClick={handleShare} style={{ background: "#f5c842", color: "#111", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              {shareMethod === "link" ? "GENERATE & COPY LINK" : shareMethod === "email" ? "OPEN IN MAIL" : "OPEN IN MESSAGES"}
            </button>

            {shareMsg && <div style={{ marginTop: 14, color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{shareMsg}</div>}

            {generatedLink && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 10, color: "#888", letterSpacing: 1, display: "block", marginBottom: 6 }}>YOUR SHAREABLE LINK</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={generatedLink} onClick={e => e.target.select()}
                    style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#60a5fa", fontSize: 11, boxSizing: "border-box" }} />
                  <button onClick={() => { navigator.clipboard?.writeText(generatedLink); setShareMsg("Copied!"); }}
                    style={{ background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "10px 14px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Copy</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
