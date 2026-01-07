import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCheck {
  label: string;
  passed: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const checks = useMemo((): PasswordCheck[] => {
    return [
      { label: "At least 6 characters", passed: password.length >= 6 },
      { label: "Contains a number", passed: /\d/.test(password) },
      { label: "Contains uppercase letter", passed: /[A-Z]/.test(password) },
      { label: "Contains special character", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
  }, [password]);

  const passedCount = checks.filter((c) => c.passed).length;

  const strength = useMemo(() => {
    if (password.length === 0) return { label: "", color: "" };
    if (passedCount <= 1) return { label: "Weak", color: "bg-destructive" };
    if (passedCount === 2) return { label: "Fair", color: "bg-orange-500" };
    if (passedCount === 3) return { label: "Good", color: "bg-yellow-500" };
    return { label: "Strong", color: "bg-green-500" };
  }, [passedCount, password.length]);

  if (password.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex-1 h-full rounded-full transition-colors ${
                i <= passedCount ? strength.color : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${
          passedCount <= 1 ? "text-destructive" : 
          passedCount === 2 ? "text-orange-500" : 
          passedCount === 3 ? "text-yellow-600" : "text-green-600"
        }`}>
          {strength.label}
        </span>
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-1 text-xs ${
              check.passed ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {check.passed ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
