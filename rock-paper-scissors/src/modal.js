export default function Modal(props) {
    const { title, visible, children, onClose } = props;
  
    if (!visible) {
      return null;
    }
  
    const handleBackdropClick = (e) => onClose();
    const handleModalClick = (e) => e.stopPropagation();
  
    return (
      <div
        className="cursor-pointer fixed left-0 top-0 z-[1055] block h-full w-full overflow-y-auto overflow-x-hidden outline-none flex backdrop-blur-sm items-center justify-center"
        id="modal-overlay"
        onClick={handleBackdropClick}
      >
        <div className="cursor-default bg-white rounded-lg border-2 px-4 py-6" onClick={handleModalClick}>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 pb-3 px-4 text-center">
            {title}
          </h2>
          {children}
        </div>
      </div>
    )
  }