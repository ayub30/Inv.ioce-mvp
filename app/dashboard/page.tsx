import Form from "../ui/form"
import SideNav from "../ui/sidenav";

export default function Dashboard() {
    return (
        <div className="flex flex-row justify-between h-screen bg-base-100">   
            <div className="overflow-y-scroll flex-1 p-6">
                <Form />
            </div>
        </div>                                      
    )
}