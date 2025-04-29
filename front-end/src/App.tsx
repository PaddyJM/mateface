function App() {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files) {
            console.log('Selected files:', files)
        }
    }

    return (
        <div className="flex justify-center items-center h-screen">
            <input
                type="file"
                onChange={handleFileChange}
                multiple
            />
        </div>
    )
}

export default App
