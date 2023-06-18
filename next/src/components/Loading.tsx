
const Loading = () => {
  return (
    <div className="grid h-screen place-items-center bg-black">
      <div className="font-monospace font-bold text-center">
        <img className={ "mx-auto animate-spin-slow"} src="img/login_title.png"/>
        <div className="p-2"></div>
        <p className="text-white">Loading...</p>
      </div>
    </div>
  )
}

export default Loading