export default function InlineFieldError({id,message}) { return message ? <span className="field-error" id={id} role="alert">{message}</span> : null; }
