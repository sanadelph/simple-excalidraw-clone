import {  useLayoutEffect,useState } from 'react';
import rough from 'roughjs/bundled/rough.esm';
import './App.css';

const generator=rough.generator()
const createRoughElement=(id,x1,y1,x2,y2,type)=>{
  const roughElement = type==='line'
  ?generator.line(x1,y1,x2,y2)
  :generator.rectangle(x1,y1,x2-x1,y2-y1)
  return {id, x1,y1,x2,y2,type,roughElement}
}
const nearPoint=(x,y,x1,y1,name)=>{
  return Math.abs(x-x1)<30 && Math.abs(y-y1)<30 ? name:null
}
const distance=(a,b)=>Math.sqrt(Math.pow(a.x-b.x,2)+Math.pow(a.y-b.y,2))
const positionWithinElement=(x,y,element)=>{
  const {type,x1,x2,y1,y2}=element;
  switch(type){
    case "rectangle":
      const topLeft=nearPoint(x,y,x1,y1,'tl')
      const topRight=nearPoint(x,y,x2,y1,'tr')
      const bottomLeft=nearPoint(x,y,x1,y2,'bl')
      const bottomRight=nearPoint(x,y,x2,y2,'br')
      const inside= x>=x1 && x<=x2 && y>=y1 && y<=y2 ? 'inside' : null
      return topLeft || topRight || bottomLeft || bottomRight || inside
    case "line":
      const a={x:x1,y:y1}
      const b={x:x2,y:y2}
      const c={x,y}
      const offset=distance(a,b)-(distance(b,c)+distance(a,c))
      const start=nearPoint(x,y,x1,y1,'start')
      const end=nearPoint(x,y,x2,y2,'end')
      const on= Math.abs(offset)<1 ? 'inside' : null
      return start || end || on
    default:
      throw new Error('Type not specified')
  }
}
const getElementAtPosition=(x,y,elements)=>{
  return elements.map(element=>({...element,position:positionWithinElement(x,y,element)}))
  .find(element=>element.position !==null)
}
const adjustCoordinates=(element)=>{
  const {type,x1,y1,x2,y2}=element;
  if(type==="rectangle"){
    const minX=Math.min(x1,x2)
    const maxX=Math.max(x1,x2)
    const minY=Math.min(y1,y2)
    const maxY=Math.max(y1,y2)
    return {x1:minX,y1:minY,x2:maxX,y2:maxY}
  }else{
    if(x1<x2 || (x1===x2 && y1<y2)){
      return {x1,y1,x2,y2}
    }
    else{
      return {x1:x2,y1:y2,x2:x1,y2:y1}
    }
  }
}
const resizedCoordinates=(x,y,position,coordinates)=>{
  // console.log(coordinates);
  const {x1,y1,x2,y2}=coordinates;
  switch(position){
    case "tl":
    case "start":
      return {x1:x,y1:y,x2,y2}
    case "tr":
      return {x1,y1:y,x2:x,y2}
    case "bl":
      return {x1:x,y1,x2,y2:y}
    case "br":
    case "end":
      return {x1,y1,x2:x,y2:y}
    default:
      return null
  }
}
const cursorIcon=position=>{
  switch(position){
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize"
    case "tr":
    case "bl":
      return "nesw-resize"
    default:
      return "move"
  }
}
function App() {
  const [elements, setElements] = useState([])
  const [selectedElement, setSelectedElement] = useState(null)
  const [tool, setTool] = useState('line')
  const [action, setAction] = useState('none')
 
  useLayoutEffect(()=>{
    
      const canvas = document.getElementById("canvas")
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0,0,canvas.width,canvas.height)
      // ctx.fillStyle = "green";
      // ctx.fillRect(10, 10, 50, 50);

      // ctx.fillStyle = "rgb(0 0 200 / 50%)";
      // ctx.fillRect(60, 60, 50, 50);
      const roughCanvas=rough.canvas(canvas)
      
      elements.forEach(({roughElement})=>roughCanvas.draw(roughElement))
  },[elements])

  const handleMouseDown=(e)=>{    
    const {clientX,clientY}=e
    if(tool==='selection'){
      //if we are selecting on elemnt, set action(move)
      const element=getElementAtPosition(clientX,clientY,elements)      
      if (element) {
        const offsetX=clientX-element.x1
        const offsetY=clientY-element.y1
        setSelectedElement({...element,offsetX,offsetY})
        setElements(prevState=>prevState)
        if(element.position==="inside"){
          setAction('moving')
        }else{
          setAction('resizing')
        }
      }
    }else{
      const id=elements.length
      const element=createRoughElement(id, clientX,clientY,clientX,clientY,tool)
      setElements(prevState=>[...prevState,element])
      setSelectedElement(element);
      setAction('drawing');
    }
    
  }
  const handleMouseMove=(e)=>{
    // if(action==="none") return
    const {clientX,clientY}=e;

    if(tool==="selection"){
      const element=getElementAtPosition(clientX,clientY,elements)
      e.target.style.cursor=element?cursorIcon(element.position):"default"
    }
    if(action==='drawing'){
      const index=elements.length-1;
      const {x1,y1}=elements[index]
      const newElement=createRoughElement(index,x1,y1,clientX,clientY, tool)
      
      const elementsCopy=[...elements]
      elementsCopy[index]=newElement;
      setElements(elementsCopy)
    }
    else if(action==='moving'){
      
      const {id,x1,x2,y1,y2,type,offsetX,offsetY}=selectedElement;
      const width=x2-x1;
      const height=y2-y1;
      const newX=clientX-offsetX;
      const newY=clientY-offsetY;
      const newElement=createRoughElement(id,newX,newY,newX+width,newY+height,type)
      
      const elementsCopy=[...elements]
      elementsCopy[id]=newElement;
      setElements(elementsCopy)
    }
    else if(action ==='resizing'){
      console.log(selectedElement);
      
      const {id,type,position,...coordinates}=selectedElement;
      const {x1,y1,x2,y2}=resizedCoordinates(clientX,clientY,position,coordinates)
      const newElement=createRoughElement(id,x1,y1,x2,y2,type)
      
      const elementsCopy=[...elements]
      elementsCopy[id]=newElement;
      setElements(elementsCopy)
    }

  }
  const handleMouseUp=(e)=>{
    if(selectedElement){
      const index=selectedElement.id
      const {id,type}=elements[index]
      if(action==='drawing' || action==="resizing"){
        const {x1,y1,x2,y2}=adjustCoordinates(elements[index]);
        const newElement=createRoughElement(id,x1,y1,x2,y2,type)
        
        const elementsCopy=[...elements]
        elementsCopy[id]=newElement;
        setElements(elementsCopy)
      }
      setAction('none')
      setSelectedElement(null)
    }

  }
  return (
    <div>
      <nav className='options'>
        <input type="radio" id='line' 
        checked={tool==='line'}
        onChange={()=>setTool('line')}/>
        <label htmlFor='line'>Line</label>
        <input type="radio" id='rectangle' 
          checked={tool==='rectangle'}
          onChange={()=>setTool('rectangle')}/>
        <label htmlFor='rectangle'>Rectangle</label>
        <input type="radio" id='selection' 
          checked={tool==='selection'}
          onChange={()=>setTool('selection')}/>
        <label htmlFor='selection'>Selection</label>
      </nav>
      <canvas id="canvas" width={window.innerWidth} 
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      >Canvas</canvas>
    </div>

  );
}

export default App;
