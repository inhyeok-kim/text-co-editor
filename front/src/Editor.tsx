import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import EditableBlock from "./EditableBlock";


let currentSelection : SelectionType;
let newSelection : SelectionType;
let noRenderBlockId : string;
let compositionState = {
    needUpdateBefore : false,
    isEnd : true,
    afterText : '',
    mergeReady : false
}
let needMoveNewSelection = false;

interface EditorProp{
    initPage : Array<BlockStateType>
    onAction : Function
    actionList : Array<ActionType>
}

function Editor({
    initPage, onAction, actionList
}:EditorProp){
    const [blocks, setBlocks] = useState(initPage);
    useEffect(()=>{
        noRenderBlockId = '';
        setBlocks(initPage);
    },[initPage]);
    const editor = useRef<HTMLDivElement>(null);
    useEffect(()=>{
        if(actionList){
            setTimeout(()=>{doAction(actionList, true)},0);
        }
    }, [actionList]);

    useEffect(()=>{
        if(newSelection){
            moveSelection(newSelection.anchorId,newSelection.focusId,newSelection.anchorOffset,newSelection.focusOffset);
            if(!needMoveNewSelection){
                newSelection = null!;
            }
            settingCurrentSelection();
        }
    }, [blocks]);

    const saveBlocks = useMemo(()=>{
        return [...initPage];
    },[initPage]);
    
    function getData(){
        console.log(saveBlocks);
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
                    fnInsertAction(action, isRemote);
                    break;
                case "delete":
                    fnDeleteAction(action, isRemote);
                    break;
                case "update":
                    fnUpdateAction(action, isRemote);
                    break;
                default:
                    break;
            }
        });
    }

    function fnInsertAction(action : ActionType, isRemote : boolean){
        const newBlockData = fnCreateNewBlock(action.data!);

        const idx = saveBlocks.findIndex(block=> block.id === action.id ? true : false);
        saveBlocks.splice(idx+1,0,newBlockData);
        if(!isRemote && currentSelection && !newSelection){
            setNextSelection(newBlockData.id,newBlockData.id,0,0);
        }
        setBlocks([...saveBlocks]);
        
    }

    function fnCreateNewBlock(data : ActionDataType){
        const newBlockData:BlockStateType = {
            id : data.id!,
            text : data.text ? data.text : '',
            isFocus : true
        }
        return newBlockData;
    }

    function fnUpdateAction(action : ActionType,isRemote : boolean){
        const orgBlcok = saveBlocks.find(block=> block.id === action.id ? true : false);
        orgBlcok!.text = action.data!.text ? action.data!.text.replaceAll('<br>','') : '';
        if(isRemote){
            if(currentSelection && currentSelection.anchorId === action.id){
                noRenderBlockId = '';
                setNextSelection(action.id,action.id,orgBlcok!.text.length,orgBlcok!.text.length);
            }
        } 
        setBlocks([...saveBlocks]);
    }

    function fnDeleteAction(action : ActionType, isRemote : boolean){
        if(saveBlocks.length === 1){
            saveBlocks[0].text = '';
        } else {
            const idx = saveBlocks.findIndex(block=> block.id === action.id ? true : false);
            saveBlocks.splice(idx,1);
        }
        if(isRemote && currentSelection && currentSelection.anchorId === action.id){
            document.getSelection()?.removeAllRanges();
        }
        setBlocks([...saveBlocks]);
    }

    function fnBeforeInput(e:any){
        const selection = currentSelection;
        let isNotUpdate = false;
        if(selection?.anchorId !== selection?.focusId){
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
                setNextSelection(sr.startId,sr.startId,sr.startOffset+1,sr.startOffset+1);
                doAction(actionList);
            }
        }
    }

    function fnBackspace(e:React.KeyboardEvent){
        const selection = currentSelection;
        let isNotUpdate = false;
        if(selection?.anchorId !== selection?.focusId){
            isNotUpdate = true;
        } else if(selection?.focusOffset === 0 && selection.anchorOffset === 0){
            isNotUpdate = true;
        }
        
        if(isNotUpdate){
            e.preventDefault();
            const sr = getSelectionRange();

            const actionList : Array<ActionType> = [];
            if(sr.startId === sr.endId){
                const prevIdx = saveBlocks.findIndex((block)=> block.id === sr.startId ? true : false) -1;
                if(prevIdx < 0) {
                    return false;
                }
                const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
                const prevBlock = saveBlocks[prevIdx];
                const act2 : ActionType = {
                    id : prevBlock.id,
                    type : 'update',
                    data : {
                        text : prevBlock.text+startText
                    }
                }
                actionList.push(act2);
                const act : ActionType = {
                    id : sr.startId,
                    type : "delete"
                }
                actionList.push(act);
                setNextSelection(prevBlock.id,prevBlock.id,prevBlock.text.length,prevBlock.text.length);
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
                setNextSelection(sr.startId,sr.startId,sr.startOffset,sr.startOffset);
            }
            noRenderBlockId = '';
            doAction(actionList);
        }

    }

    function fnCompositionStart(e:any){
        if(currentSelection.anchorNode !== currentSelection.focusNode){
            compositionState.needUpdateBefore = true;
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
            setNextSelection(sr.startId,sr.startId,sr.startOffset,sr.startOffset);
            doAction(actionList);
            
        }
    }

    function fnCompositionUpdate(e:any){
        if(compositionState.needUpdateBefore){
            const sr = getSelectionRange();
            const actionList : Array<ActionType> = [];
            const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')!.innerHTML!;
            const newStartText = startText + e.nativeEvent.data + compositionState.afterText
            editor.current!.querySelector('div[data-block-id='+sr.startId+']')!.append(compositionState.afterText);
            
            const act : ActionType = {
                id : sr.startId,
                type : "update",
                data : {text : newStartText},
            }
            actionList.push(act);
            
            doAction(actionList);
            compositionState.needUpdateBefore = false;
            compositionState.mergeReady = true;
        }
    }
    
    function fnCompositionEnd(e:any){
        if(compositionState.mergeReady){
            const text = saveBlocks.find((block)=> block.id === currentSelection.anchorId ? true : false)?.text;
            editor.current!.querySelector('div[data-block-id='+currentSelection.anchorId+']')!.innerHTML = text!;
            moveSelection(currentSelection.anchorId, currentSelection.anchorId, currentSelection.anchorOffset, currentSelection.anchorOffset);
            compositionState.mergeReady = false;
        }
    }


    function onKeyDown(e:React.KeyboardEvent){
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
    function onKeyUp(e:React.KeyboardEvent){

    }
    function onInput(e:React.FormEvent){
        if(currentSelection.anchorId !== currentSelection.focusId){

        } else {
            if(e.nativeEvent.data === '\u001d'){
                compositionState.mergeReady = true;
            } else {
                const sr = getSelectionRange();
                        
                const actionList : Array<ActionType> = [];
                const startText = editor.current?.querySelector('div[data-block-id='+sr.startId+']')?.innerHTML;
                const newStartText = startText?.replaceAll('<br>','');
                const act : ActionType = {
                    id : sr.startId,
                    type : "update",
                    data : {text : newStartText},
                }
                actionList.push(act);
                doAction(actionList);
            }
        }
        
    }

    function onBeforeInput(e:React.FormEvent){
        fnBeforeInput(e);
    }

    function onSelect(e: React.BaseSyntheticEvent){
        // if(document.getSelection()?.anchorNode !== currentSelection.anchorNode){
            //     moveSelection(currentSelection.anchorId, currentSelection.focusId, currentSelection.anchorOffset, currentSelection.focusOffset);
            // } else {
        if(needMoveNewSelection){
            moveSelection(newSelection.anchorId,newSelection.focusId,newSelection.anchorOffset,newSelection.focusOffset);
            needMoveNewSelection = false;
        }
        newSelection = null!;
        settingCurrentSelection();
        // }
    }

    function onPaste(e:React.ClipboardEvent){
        e.preventDefault();
        const event = e.nativeEvent;
        let copyList = event.clipboardData!.getData('text').replaceAll('\r','').split('\n');

        if(copyList){
            const sr = {...getSelectionRange()};
            const actionList = [];
            if(sr.startId !== sr.endId){
                let currentId = document.querySelector(`[data-block-id=${sr.startId}]`)?.nextElementSibling?.dataset.blockId;
                while (currentId !== sr.endId){
                    const act :ActionType = {
                        id : currentId,
                        type : 'delete'
                    }
                    actionList.push(act);
                    currentId = document.querySelector(`[data-block-id=${currentId}]`)?.nextElementSibling?.dataset.blockId;
                }
            } 

            if(sr.startId === sr.endId){ // 복사할 곳이 한줄일 경우
                if(copyList.length === 1){ // 복사할게 한줄일 경우
                    copyList.forEach((copy)=>{
                        const text = document.querySelector(`[data-block-id=${sr.startId}]`)?.innerHTML;
                        const newText = text?.substring(0,sr.startOffset) + copy + text?.substring(sr.endOffset,text.length);
                        document.querySelector(`[data-block-id=${sr.startId}]`)!.innerHTML = newText;
                        const newOffset = (text?.substring(0,sr.startOffset) + copy).length;
                        const act :ActionType = {
                            id : sr.startId,
                            type : 'update',
                            data : {
                                text : newText
                            }
                        }
                        actionList.push(act);
                        setNextSelection(sr.startId,sr.startId,newOffset,newOffset);
                    });
                } else { // 여러줄 삽입일 경우
                    let currentId = sr.startId;
                    let endText = '';
                    copyList.forEach((copy,i)=>{
                        const text = document.querySelector(`[data-block-id=${currentId}]`)?.innerHTML;
                        if(i === 0){
                            const newText = text?.substring(0,sr.startOffset) + copy;
                            endText = text!.substring(sr.endOffset,text!.length);
                            document.querySelector(`[data-block-id=${currentId}]`)!.innerHTML = newText;
                            const act :ActionType = {
                                id : currentId,
                                type : 'update',
                                data : {
                                    text : newText
                                }
                            }
                            actionList.push(act);
                        } else if(i === copyList.length-1){
                            const newText = copy + endText;
                            const newId = uid();
                            const act :ActionType = {
                                id : currentId,
                                type : 'insert',
                                data : {
                                    id : newId,
                                    text : newText
                                }
                            }
                            actionList.push(act);
                            currentId = newId;
                            needMoveNewSelection = true;
                            setNextSelection(currentId,currentId,copy.length,copy.length);
                        } else {
                            const newId = uid();
                            const act :ActionType = {
                                id : currentId,
                                type : 'insert',
                                data : {
                                    id : newId,
                                    text : copy
                                }
                            }
                            actionList.push(act);
                            currentId = newId;
                        }
                    });
                }
            } else { // 복사할 곳이 여러줄 일 경우
                if(copyList.length === 1){ // 복사할게 한줄일 경우
                    copyList.forEach((copy)=>{
                        const startText = document.querySelector(`[data-block-id=${sr.startId}]`)?.innerHTML;
                        const endText = document.querySelector(`[data-block-id=${sr.endId}]`)?.innerHTML;
                        const newText = startText?.substring(0,sr.startOffset) + copy + endText?.substring(sr.endOffset,endText.length);
                        document.querySelector(`[data-block-id=${sr.startId}]`)!.innerHTML = newText;
                        const newOffset = (startText?.substring(0,sr.startOffset) + copy).length;
                        const act :ActionType = {
                            id : sr.startId,
                            type : 'update',
                            data : {
                                text : newText
                            }
                        }
                        actionList.push(act);
                        const act2 :ActionType = {
                            id : sr.endId,
                            type : 'delete'
                        }
                        actionList.push(act2);
                        setNextSelection(sr.startId,sr.startId,newOffset,newOffset);
                    });
                } else { // 여러줄 삽입일 경우
                    let currentId = sr.startId;
                    copyList.forEach((copy,i)=>{
                        const text = document.querySelector(`[data-block-id=${currentId}]`)?.innerHTML;
                        if(i === 0){
                            const newText = text?.substring(0,sr.startOffset) + copy;
                            document.querySelector(`[data-block-id=${currentId}]`)!.innerHTML = newText;
                            const act :ActionType = {
                                id : currentId,
                                type : 'update',
                                data : {
                                    text : newText
                                }
                            }
                            actionList.push(act);
                        } else if(i === copyList.length-1){
                            const endText = document.querySelector(`[data-block-id=${sr.endId}]`)?.innerHTML;
                            const newText = copy + endText?.substring(sr.endOffset,endText.length);
                            document.querySelector(`[data-block-id=${sr.endId}]`)!.innerHTML = newText;
                            const act :ActionType = {
                                id : sr.endId,
                                type : 'update',
                                data : {
                                    text : newText
                                }
                            }
                            actionList.push(act);
                            setNextSelection(sr.endId,sr.endId,copy.length,copy.length);
                        } else {
                            const newId = uid();
                            const act :ActionType = {
                                id : currentId,
                                type : 'insert',
                                data : {
                                    id : newId,
                                    text : copy
                                }
                            }
                            actionList.push(act);
                            currentId = newId;
                        }
                    });
                }
            }
            
            doAction(actionList);
        }
    }

    function onCopy(e:React.ClipboardEvent){
    }

    function onCompositionEnd(e:any){
        fnCompositionEnd(e);
    }
    
    function onCompositionStart(e:any){
        fnCompositionStart(e);
    }
    
    function onCompositionUpdate(e:any){
        fnCompositionUpdate(e);
    }

    function setNextSelection(anchorId:string, focusId:string,anchorOffset:number, focusOffset:number){
        newSelection = {
            anchorId : anchorId,
            focusId : focusId,
            anchorOffset : anchorOffset,
            focusOffset : focusOffset
        }
    }
    function settingCurrentSelection(){
        const selection = document.getSelection();
        if(selection){
            const anchorNode = selection?.anchorNode;
            const anchorOffset = selection?.anchorOffset;
            const focusNode = selection?.focusNode;
            const focusOffset = selection?.focusOffset;
            
            let anchorId ='';
            let focusId = '';
            if(selection?.anchorNode?.nodeName === 'DIV'){
                anchorId = selection?.anchorNode?.dataset.blockId;
            } else {
                anchorId = selection?.anchorNode?.parentElement!.dataset.blockId;
                
            }
            if(selection?.focusNode?.nodeName === 'DIV'){
                focusId = selection?.focusNode?.dataset.blockId;
            } else {
                focusId = selection?.focusNode?.parentElement?.dataset.blockId;
            }
            const newSelection : SelectionType = {
                anchorNode : anchorNode,
                focusNode : focusNode,
                anchorId : anchorId,
                focusId : focusId,
                anchorOffset : anchorOffset,
                focusOffset : focusOffset
            };
            currentSelection = newSelection;
            noRenderBlockId = anchorId;
        }
    }

    function getSelectionRange(){
        const selection = currentSelection;
        
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

        const newId = uid();
        actionList.push({
            id : sr.startId,
            type : "insert",
            data : {
                id : newId,
                text : newBlockText
            },
        });

        noRenderBlockId = '';
        doAction(actionList);
    }

    function moveSelection(startId:string, endId:string,start:number, end:number){
        const selection = document.getSelection()!;
        const range = selection!.getRangeAt(0);
        const newRange = range!.cloneRange();
        const startTarget = editor.current?.querySelector(`div[data-block-id=${startId}`);
        const endTarget = editor.current?.querySelector(`div[data-block-id=${endId}`);
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
        selection?.removeAllRanges();
        selection?.addRange(newRange);
    }

    return (
        <>
            {/* <button onClick={getData}>데이터 출력</button> */}
            <EditorDiv 
                ref={editor}
                contentEditable={true}
                style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                onInput={onInput}
                onBeforeInput={onBeforeInput}
                onSelect={onSelect}
                onPaste={onPaste}
                onCopy={onCopy}
                onCompositionStart={(e)=>{onCompositionStart(e)}}
                onCompositionEnd={(e)=>{onCompositionEnd(e)}}
                onCompositionUpdate={(e)=>{onCompositionUpdate(e)}}
            >
                {blocks.map((block,i)=>{
                    return (<EditableBlock 
                            key={block.id} 
                            id={block.id} 
                            text={block.text}
                            isPlaceholder={i===0 && blocks.length === 1}
                            isFocus={block.id === noRenderBlockId}
                             />)
                })}
            </EditorDiv>
        </>
    )
}

export default Editor;


function uid(){
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const EditorDiv = styled.div`
    &:focus{
        outline: 0px solid transparent;
    }
`