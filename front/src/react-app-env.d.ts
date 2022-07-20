/// <reference types="react-scripts" />

interface PageType {
    id : string
    text : string
    pageData : Array<BlockStateType>
}
interface BlockStateType{
    id : string
    text : string
    readonly? : boolean
    onAction? : Function
    isFocus? : boolean
    isPlaceholder? : boolean
}

interface ActionType{
    id : string
    type : 'update' | 'delete' | 'insert'
    start? : number
    end? : number
    data? : ActionDataType
    noRender? : boolean
}

interface ActionDataType {
    id? : string
    text? : string
}

interface SelectionType{
    anchorNode? : any
    focusNode? : any
    anchorId : string
    focusId : string
    anchorOffset : number
    focusOffset : number
}

interface Node {
    dataset : any
}

interface Event{
    data : any
}

interface DataTransfer{
    editorData : any
}