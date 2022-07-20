import { useEffect, useState } from "react";
import styled from "styled-components";
// import Editable from "./Editable";
import Editor from "./Editor";

let ws : WebSocket;
function App(){
    const [page, setPage] = useState();
    const [actionList, setActionList] = useState();
    const [pageList, setPageList] = useState([]);
    const [currentPage , setCurrentPage] = useState<PageType>();

    useEffect(()=>{
        if(!ws){
            connect();
        }
    },[]);

    function connect(){
        ws = new WebSocket('ws://192.168.10.107:4000');
        ws.onopen = function(){
            console.log('socket connected');
            ws.onmessage = function(message){
                onMessage(message.data);
            }
            login(ws);
        }
    }

    function login(ws : WebSocket){
        const loginInfo = {
            method : 'login',
            data : uid()
        }
        ws.send(JSON.stringify(loginInfo));
    }

    function onMessage(message:any){
        const event = JSON.parse(message);
        const method = event.method;
        switch (method) {
            case "pageList":
                setPageList(event.data);
                break;
            case "page_init":
                pageInit(event.data);           
                break;
            case 'action':
                receiveAction(event.data);
                break;
            case 'response_page':
                pageInit(event.data);
                break;
            default:
                break;
        }
    }

    function receiveAction(actionList :any){
        setActionList(actionList);
    }

    function pageInit(pageData:any){
        setPage(pageData);
    }

    function onAction(actionList : Array<ActionType>){
        const message = {
            method : 'action',
            pageId : currentPage!.id,
            data : actionList
        };
        ws.send(JSON.stringify(message));
    }

    function addPage(){
        const message = {
            method : 'addPage',
        };
        ws.send(JSON.stringify(message));
    }

    useEffect(()=>{
        if(currentPage){
            requestPage(currentPage!.id);
        }
    },[currentPage]);
    function requestPage(pageId:string){
        const message = {
            method : 'request_page',
            data : pageId
        }
        ws.send(JSON.stringify(message));
    }

    return (
        <Wrapper>
            <Header>
                {/* <button onClick={connect}>접속하기</button> */}
            </Header>
            <Aside>
                <Button className={"new_page"} onClick={addPage}>+ 새 페이지</Button>
                <PageUl>
                    {pageList ? 
                        pageList.map((page:PageType)=>{
                            return <PageLi key={page.id} onClick={()=>{setCurrentPage(page)}}
                                style={{cursor:'pointer'}}
                            >{page.text}</PageLi>
                        })
                        :
                        ''
                    }
                </PageUl>
            </Aside>
            <Page>
                {currentPage ? 
                    <h1 style={{borderBottom : '1px solid lightgrey'}}>{currentPage?.text}</h1>
                    :
                    ''
                }
                {page ? 
                    (<Editor initPage={page} onAction={(actionList : Array<ActionType>)=>onAction(actionList)} actionList={actionList!} />)
                    :
                    ''
                }
            </Page>
        </Wrapper>
    )
}

export default App;

function uid(){
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const Wrapper = styled.div`
    display: flex;
    flex-wrap: wrap;
`;

const Header = styled.div`
    width: 100%;
    height : 50px;
    background-color: #3bffad;
`;

const Aside = styled.div`
    width : 15%;
    height: calc(100vh - 50px);
    border-right: 1px solid #f1f1d4;
    background-color: ivory;
    overflow-y: auto;
`;

const Page = styled.div`
    width : 85%;
    height: calc(100vh - 50px);
    padding : 10px;
    overflow-y: auto;
`
const Button = styled.button`
    &.new_page {
        width: 100%;
        cursor: pointer;
        background: none;
        border: none;
        font-size: 1rem;
        padding : 5px 0px;
    }
    &.new_page:hover{
        background: #80808016;
    }
`

const PageUl = styled.ul`
    padding : 0px;
`;
const PageLi = styled.li`
    display: flex;
    position: relative;
    height : 30px;
    list-style : none;
    padding-left: 30px;
    align-items: center;

    &:hover{
        background: #80808016;
    }
    &:hover::after{
        content : '';
        position: absolute;
        width: 6px;
        height: 6px;
        border-top : 1px solid grey;
        border-right: 1px solid grey;
        right: 10px;
        transform: rotateZ(45deg);
    }
`;