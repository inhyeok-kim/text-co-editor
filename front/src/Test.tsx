import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import EditableBlock from "./EditableBlock";
import './Editor.css';

let focusTarget = '';
let focusIndex = [0,0];
let customSelection : {
    anchorNode?: any
    anchorId? : any
    anchorOffset?: any
    focusNode?: any
    focusId?: any
    focusOffset?: any
} = {
    anchorNode : '',
    focusNode : '',
    anchorId : '',
    focusId: '',
    anchorOffset : '',
    focusOffset : ''
}
let first = true;
let compositionState = {
    needUpdateBefore : false,
    isEnd : true,
    afterText : '',
    mergeReady : false
}

let saveBlocks : Array<BlockStateType> = [];

interface EditorProp{
    initPage : Array<BlockStateType>
    onAction : Function
    actionList : Array<ActionType>
}
function Test({
    initPage, onAction, actionList
}:EditorProp){
    const [blocks, setBlocks] = useState(initPage);
    const editor = useRef<HTMLDivElement>(null);
    const [focusId, setFocusId] = useState(['','']);
    
   

    useEffect(()=>{
        if(first){
            editor.current?.addEventListener('beforeinput',fnBeforeInput);
            saveBlocks = {...initPage};
        }
        first = false;
    },[]);

    useEffect(()=>{
        if(actionList){
            setTimeout(()=>{doAction(actionList, true)},0);
        }
    }, [actionList]);

    useEffect(()=>{
        if(focusId[0] && focusId[1]){
            moveSelection(focusId[0],focusId[1],focusIndex[0],focusIndex[1]);
        }
    },[focusId]);

    function fnCreateBlock(id:string , text : string){
        const block = document.createElement('div');
        block.className = 'ComBlock';
        block.dataset.id = id;
        block.innerHTML = text;
        return block;
    }

    function doAction(action:ActionType|Array<ActionType>,isRemote:boolean = false){
        let actionList : Array<ActionType> = [];
        if("id" in action){
            actionList.push(action);
        } else {
            actionList = [...action];
        }
        if(!isRemote){
            onAction(actionList);
        }
        actionList.forEach((action)=>{
            switch (action.type) {
                case "insert":
                    fnInsertAction(action);
                    break;
                case "delete":
                    fnDeleteAction(action);
                    break;
                case "update":
                    fnUpdateAction(action);
                    break;
                default:
                    break;
            }
        });
        if(!isRemote){
            if(focusTarget){
                setFocusId([focusTarget,focusTarget]);
            }
        }
        
    }

    function fnInsertAction(action : ActionType){
        fnCreateNewBlock(action.id, action.data!);
    }
    function fnDeleteAction(action : ActionType){
        fnDeleteBlock(action.id);
    }
    function fnUpdateAction(action : ActionType){
        fnUpdateBlock(action.id, action.data!);
    }

    function onInput(e:React.FormEvent){
        fnInput(e);
        console.log(e);
    }
    
    
    function onCompositionEnd(e:any){
        // console.log(e.nativeEvent);
        // fnCompositionEnd(e);
    }
    
    function onCompositionStart(e:any){
        // console.log(e.nativeEvent);
        // fnCompositionStart(e);
    }
    
    function onCompositionUpdate(e:any){
        // console.log(e.nativeEvent);
        // fnCompositionUpdate(e);
    }

    function onKeyUp(e:React.KeyboardEvent){
        // console.log(e.code);
    }

    function onKeyDown(e:React.KeyboardEvent){
        // console.log(e);
        // setSelection();
        if(e.nativeEvent.isComposing){
            e.preventDefault();
        } else {
            switch (e.code) {
                case "Backspace":
                    fnBackspace(e);
                    break
                case "Enter":
                    fnEnter(e);
                    break;
                default:
                    break;
            }
        }
    }

    function setSelection(){
        const selection = document.getSelection();
        if(selection){
            customSelection.anchorNode = selection?.anchorNode;
            customSelection.anchorOffset = selection?.anchorOffset;
            customSelection.focusNode = selection?.focusNode;
            customSelection.focusOffset = selection?.focusOffset;
            
            let startId ='';
            let endId = '';
            if(selection?.anchorNode?.nodeName === 'DIV'){
                startId = selection?.anchorNode?.dataset.blockId;
            } else {
                startId = selection?.anchorNode?.parentElement?.dataset.blockId;
                
            }
            if(selection?.focusNode?.nodeName === 'DIV'){
                endId = selection?.focusNode?.dataset.blockId;
            } else {
                endId = selection?.focusNode?.parentElement?.dataset.blockId;
            }
            customSelection.anchorId = startId;
            customSelection.focusId = endId;
        }
    }

    function getSelectionRange(){
        const selection = customSelection;
        
        let startId='';
        let endId='';
        let startOffset =0;
        let endOffset=0;
        let startNode;
        let endNode;
        if(selection.anchorNode === selection.focusNode){
            startId = selection.anchorId;
            endId = selection.focusId;
            startOffset = Math.min(selection.anchorOffset,selection.focusOffset);
            endOffset = Math.max(selection.anchorOffset,selection.focusOffset);
            startNode = selection.anchorNode;
            endNode = selection.focusNode;
        } else {
            const _blocks = editor.current!.children;
            for(let i=0; i<_blocks.length;i++){
                const _block = _blocks[i];
    
                if(_block.dataset.blockId === selection.anchorId){
                    startId = selection.anchorId;
                    endId = selection?.focusId;
                    startOffset = selection?.anchorOffset!;
                    endOffset = selection?.focusOffset!;
                    startNode = selection.anchorNode;
                    endNode = selection.focusNode;
                    break;
                }
                if(_block.dataset.blockId === selection.focusId){
                    startId = selection?.focusId;
                    endId = selection.anchorId;
                    endOffset = selection?.anchorOffset!;
                    startOffset = selection?.focusOffset!;
                    startNode = selection.focusNode;
                    endNode = selection.anchorNode;
                    break;
                }
            }
        }
        return {startId, endId, startOffset, endOffset, startNode, endNode};
    }

    function fnCompositionUpdate(e:any){
        console.log('update');
        if(compositionState.needUpdateBefore){
            const sr = getSelectionRange();
            // const actionList : Array<ActionType> = [];
            const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')!.innerHTML!;
            const newStartText = startText?.substring(0,sr.startOffset-1) + startText?.substring(sr.endOffset,startText.length);
            editor.current!.querySelector('div[data-block-id='+sr.startId+']')!.innerHTML = newStartText;
            // console.log('1'+newStartText);
            // compositionState.mergeReady = true;
            // const act : ActionType = {
            //     id : sr.startId,
            //     type : "update",
            //     data : {text : newStartText},
            //     noRender : true
            // }
            // actionList.push(act);
            
            // doAction(actionList);
            // moveSelection(customSelection.anchorId, customSelection.anchorId, customSelection.anchorOffset-1, customSelection.anchorOffset-1);
            // compositionState.needUpdateBefore = false;
        }
    }
    
    function fnCompositionEnd(e:any){
        console.log('end');
        compositionState.isEnd = true;
        if(compositionState.mergeReady){
            const text = editor.current?.querySelector('div[data-block-id='+customSelection.anchorId+']')?.innerHTML;
            editor.current!.querySelector('div[data-block-id='+customSelection.anchorId+']')!.innerHTML = text!;
            compositionState.mergeReady = false;
            moveSelection(customSelection.anchorId, customSelection.anchorId, customSelection.anchorOffset, customSelection.anchorOffset);
        }
    }
    
    function fnCompositionStart(e:any){
        console.log('start');
        if(compositionState.isEnd){
            compositionState.isEnd = false;
        } else {
            compositionState.needUpdateBefore = true;
        }
        
        if(customSelection.anchorNode !== customSelection.focusNode){
            const sr = getSelectionRange();
                
            const actionList : Array<ActionType> = [];
            const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
            const endText = editor.current?.querySelector('div[data-block-id='+sr.endId+']')?.innerHTML;
            compositionState.afterText = endText!.substring(sr.endOffset,endText!.length);
            const newStartText = startText!.substring(0,sr.startOffset);
            const act : ActionType = {
                id : sr.startId,
                type : "update",
                data : {text : newStartText}
            }
            actionList.push(act);
        
            let isTarget = false;
            for(let i=0; i<saveBlocks.length;i++){
                if(saveBlocks[i].id === sr.startId) {
                    isTarget = true;
                    continue;
                }
                if(saveBlocks[i].id === sr.endId){
                    isTarget = false;
                    break;
                }
                if(isTarget){
                    const act :ActionType = {
                        id : saveBlocks[i].id,
                        type : 'delete'
                    }
                    actionList.push(act);
                }
            }
            
            const act2 : ActionType = {
                id : sr.endId,
                type : "delete"
            }
            actionList.push(act2);
            focusTarget = sr.startId;

            focusIndex = [sr.startOffset,sr.startOffset];
            doAction(actionList);
            
        }
    }

    function fnInput(e:React.FormEvent){
        if(customSelection.anchorNode !== customSelection.focusNode){
            const sr = getSelectionRange();
                
            const actionList : Array<ActionType> = [];
            const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
            const newStartText = startText + compositionState.afterText;
            editor.current!.querySelector('div[data-block-id='+sr.startId+']')!.append(compositionState.afterText);
            compositionState.mergeReady = true;
            const act : ActionType = {
                id : sr.startId,
                type : "update",
                data : {text : newStartText},
                noRender : true
            }
            actionList.push(act);
            focusTarget = sr.startId;

            focusIndex = [sr.startOffset,sr.startOffset];
            doAction(actionList);

        } else {
            if(compositionState.needUpdateBefore){
                const sr = getSelectionRange();
                const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')!.innerHTML!;
                console.log('2'+startText);
                // const sr = getSelectionRange();
                // console.log(sr);
                // const actionList : Array<ActionType> = [];
                // const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')!.innerHTML!;
                // const newStartText = startText?.substring(0,sr.startOffset-2) + startText?.substring(sr.endOffset-1,startText.length);
                // editor.current!.querySelector('div[data-block-id='+sr.startId+']')!.innerHTML = newStartText;
                // compositionState.mergeReady = true;
                // const act : ActionType = {
                //     id : sr.startId,
                //     type : "update",
                //     data : {text : newStartText},
                //     noRender : true
                // }
                // actionList.push(act);
                
                // doAction(actionList);
                moveSelection(customSelection.anchorId, customSelection.anchorId, customSelection.anchorOffset-1, customSelection.anchorOffset-1);
                compositionState.needUpdateBefore = false;
            }
            else {
                const sr = getSelectionRange();
                    
                const actionList : Array<ActionType> = [];
                const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
                const newStartText = startText;
                const act : ActionType = {
                    id : sr.startId,
                    type : "update",
                    data : {text : newStartText},
                    noRender : true
                }
                actionList.push(act);
                doAction(actionList);
            }
        }
    }

    function fnBeforeInput(e:any){
        const selection = customSelection;
        let isNotUpdate = false;
        if(selection?.anchorNode !== selection?.focusNode){
            isNotUpdate = true;
        }
        if(isNotUpdate){
            e.stopPropagation();
            e.preventDefault();
            if(!e.isComposing){
                const sr = getSelectionRange();
                
                const actionList : Array<ActionType> = [];
                    const newData = e.isComposing ? '' : e.data
                    const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
                    const endText = editor.current?.querySelector('div[data-block-id='+sr.endId+']')?.innerHTML;
                    const newStartText = startText!.substring(0,sr.startOffset) + newData + endText!.substring(sr.endOffset,endText?.length);
                    const act : ActionType = {
                        id : sr.startId,
                        type : "update",
                        data : {text : newStartText}
                    }
                    actionList.push(act);
                
                let isTarget = false;
                for(let i=0; i<saveBlocks.length;i++){
                    if(saveBlocks[i].id === sr.startId) {
                        isTarget = true;
                        continue;
                    }
                    if(saveBlocks[i].id === sr.endId){
                        isTarget = false;
                        break;
                    }
                    if(isTarget){
                        const act :ActionType = {
                            id : saveBlocks[i].id,
                            type : 'delete'
                        }
                        actionList.push(act);
                    }
                }
                
                const act2 : ActionType = {
                    id : sr.endId,
                    type : "delete"
                }
                actionList.push(act2);
                focusTarget = sr.startId;

                focusIndex = [sr.startOffset+1,sr.startOffset+1];
                doAction(actionList);
            }
        }
    }

    function fnBackspace(e:React.KeyboardEvent){
        const selection = customSelection;
        let isNotUpdate = false;
        if(selection?.anchorNode !== selection?.focusNode){
            isNotUpdate = true;
        } else if(selection?.focusOffset === 0 && selection.anchorOffset === 0){
            isNotUpdate = true;
        }

        if(isNotUpdate){
            e.preventDefault();
            const sr = getSelectionRange();

            const actionList : Array<ActionType> = [];
            if(sr.startId === sr.endId){
                const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
                const prevIdx = saveBlocks.findIndex((block)=> block.id === sr.startId ? true : false) -1;
                if(prevIdx >= 0) {
                    focusTarget = saveBlocks[prevIdx].id
                } else {
                    return false;
                }
                focusIndex = [saveBlocks[prevIdx].text.length,saveBlocks[prevIdx].text.length];
                const act2 : ActionType = {
                    id : focusTarget,
                    type : 'update',
                    data : {
                        text : saveBlocks[prevIdx].text+startText
                    }
                }
                actionList.push(act2);
                const act : ActionType = {
                    id : sr.startId,
                    type : "delete"
                }
                actionList.push(act);
            } else {
                const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
                const endText = editor.current?.querySelector('div[data-block-id='+sr.endId+']')?.innerHTML;
                const newStartText = startText!.substring(0,sr.startOffset) + endText!.substring(sr.endOffset,endText?.length);
                const act : ActionType = {
                    id : sr.startId,
                    type : "update",
                    data : {text : newStartText}
                }
                actionList.push(act);

                let isTarget = false;
                for(let i=0; i<saveBlocks.length;i++){
                    if(saveBlocks[i].id === sr.startId) {
                        isTarget = true;
                        continue;
                    }
                    if(saveBlocks[i].id === sr.endId){
                        isTarget = false;
                        break;
                    }
                    if(isTarget){
                        const act :ActionType = {
                            id : saveBlocks[i].id,
                            type : 'delete'
                        }
                        actionList.push(act);
                    }
                }
                
                const act2 : ActionType = {
                    id : sr.endId,
                    type : "delete"
                }
                actionList.push(act2);
                focusTarget = sr.startId;

                focusIndex = [sr.startOffset,sr.startOffset];
            }

            doAction(actionList);
        }

    }

    function fnEnter(e:React.KeyboardEvent){
        e.preventDefault();
        const sr = getSelectionRange();

        const actionList : Array<ActionType> = [];
        let newBlockText = '';
        if(sr.startId === sr.endId){
            const text = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
            const newText = text? text.substring(0,sr.startOffset) : '';
            const act : ActionType = {
                id : sr.startId,
                type : "update",
                data : {text : newText }
            }
            actionList.push(act);
            newBlockText = text? text.substring(sr.endOffset,text!.length) : '';
        } else {
            const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
            const newStartText = startText!.substring(0,sr.startOffset);
            const act : ActionType = {
                id : sr.startId,
                type : "update",
                data : {text : newStartText}
            }
            actionList.push(act);

            let isTarget = false;
            for(let i=0; i<saveBlocks.length;i++){
                if(saveBlocks[i].id === sr.startId) {
                    isTarget = true;
                    continue;
                }
                if(saveBlocks[i].id === sr.endId){
                    isTarget = false;
                    break;
                }
                if(isTarget){
                    const act :ActionType = {
                        id : saveBlocks[i].id,
                        type : 'delete'
                    }
                    actionList.push(act);
                }
            }

            const endText = editor.current?.querySelector('div[data-block-id='+sr.endId+']')?.innerHTML;
            newBlockText = endText!.substring(sr.endOffset,endText?.length);
            const act2 : ActionType = {
                id : sr.endId,
                type : "delete"
            }
            actionList.push(act2);

        }

        if(newBlockText === ''){
            newBlockText = '';
        }
        const newId = uid();
        actionList.push({
            id : sr.startId,
            type : "insert",
            data : {
                id : newId,
                text : newBlockText
            },
        });

        focusTarget = newId;
        focusIndex = [0,0];

        doAction(actionList);

    }

    function fnUpdateBlock(id:string, data : ActionDataType){
        const orgBlcok = saveBlocks.find(block=> block.id === id ? true : false);
        orgBlcok!.text = data.text ? data.text : '';
    }

    function fnDeleteBlock(id:string){
        if(saveBlocks.length === 1){
            saveBlocks[0].text = '';
        } else {
            const idx = saveBlocks.findIndex(block=> block.id === id ? true : false);
            saveBlocks.splice(idx,1);
        }
    }

    function fnCreateNewBlock(beforeId:string, data : ActionDataType){
        const newBlockData:BlockStateType = {
            id : data.id!,
            text : data.text ? data.text : '',
            isFocus : true
        }
        // const newBlock = fnCreateBlock(data.id!, data.text ? data.text : '');
        
        // const nextEle = document.querySelector(`div[data-block-id=${beforeId}]`)!.nextElementSibling;
        // if(nextEle){
        //     editor.current?.insertBefore(newBlock,nextEle);
        // } else {
        //     editor.current?.appendChild(newBlock);
        // }

        const idx = saveBlocks.findIndex(block=> block.id === beforeId ? true : false);
        saveBlocks.splice(idx+1,0,newBlockData);
        
    }

    function moveSelection(startId:string, endId:string,start:number, end:number){
        console.log(startId,endId,start,end);
        const selection = document.getSelection()!;
        const range = selection!.getRangeAt(0);
        const newRange = range!.cloneRange();
        const startTarget = editor.current?.querySelector(`div[data-block-id=${startId}`);
        const endTarget = editor.current?.querySelector(`div[data-block-id=${endId}`);
        try {
            if(startTarget?.firstChild){
                newRange.setStart(startTarget.firstChild,start);
            } else {
                newRange.setStart(startTarget!,start);
            }
            if(endTarget?.firstChild){
                newRange.setEnd(endTarget.firstChild,end);
            } else {
                newRange.setEnd(endTarget!,end);
            }
        } catch (error) {
            console.log(startTarget);
            if(startTarget){
                if(startTarget.firstChild){
                    console.log('1');
                    newRange.setStart(startTarget.firstChild,startTarget.innerHTML.length);
                    newRange.setEnd(startTarget.firstChild!,startTarget.innerHTML.length);
                } else {
                    console.log('2');
                    newRange.setStart(startTarget!,startTarget.innerHTML.length);
                    newRange.setEnd(startTarget!,startTarget.innerHTML.length);
                }
            } else {
                console.log('3');
                newRange.setStart(editor.current!.firstChild!,0);
                newRange.setEnd(editor.current!.firstChild!,0);
            }
        }
        selection?.removeAllRanges();
        selection?.addRange(newRange);
        setSelection();
        focusTarget = '';
        focusIndex = [0,0];
    }

    function getData(){
        console.log(saveBlocks);
    }
    
    function onSelect(e:any){
        setSelection();
    }

    return (
        <>
            <button onClick={getData}>데이터 출력</button>
            <EditorDiv 
                ref={editor}
                contentEditable={true}
                style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}
                onKeyDown={(e)=>{onKeyDown(e)}}
                onKeyUp={(e)=>{onKeyUp(e)}}
                onInput={(e)=>{onInput(e)}}
                onCompositionStart={(e)=>{onCompositionStart(e)}}
                onCompositionEnd={(e)=>{onCompositionEnd(e)}}
                onCompositionUpdate={(e)=>{onCompositionUpdate(e)}}
                onSelect={onSelect}
                // onBeforeInput={(e)=>{onBeforeInput(e)}}
            >
                {blocks.map(block=>{
                    return (<EditableBlock 
                            key={block.id} 
                            id={block.id} 
                            text={block.text} />)
                })}
            </EditorDiv>
        </>
    )
}

export default Test;


function uid(){
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const EditorDiv = styled.div`
    &:focus{
        outline: 0px solid transparent;
    }
`
