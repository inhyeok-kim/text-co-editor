import React, { useEffect, useRef, useState } from "react";
import styled from 'styled-components';

function EditableBlock({id, text, readonly = false, onAction = ()=>{}, isFocus=false, isPlaceholder = false} : BlockStateType){

    const div = useRef<HTMLDivElement>(null);
    useEffect(()=>{
        if(!isFocus){
            div.current!.innerHTML = text;
        }
    }, [text]);

    return (
        <Block
            ref={div}
            data-block-id={id}
            placeholder={isPlaceholder? 'type anything...' : ''}
        >
        </Block>
    )
}

export default EditableBlock;

const Block = styled.div`
    min-height : 1.5rem;
    &:focus{
        background-color: black;
    }

    &:empty:before{
        content: attr(placeholder);
        color : #8a8a8a;
        cursor: text;
    }
`
