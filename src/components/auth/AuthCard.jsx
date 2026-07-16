export default function AuthCard({ children, as: Component = 'div', className = '', ...props }) {
  return (
    <Component className={`auth-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
