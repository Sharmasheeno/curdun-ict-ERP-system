<?php
namespace Core;

class Validator {
    public static function validate(array $data, array $rules): array {
        $errors = [];
        
        foreach ($rules as $field => $ruleString) {
            $ruleArray = explode('|', $ruleString);
            $value = $data[$field] ?? null;

            if (in_array('nullable', $ruleArray) && ($value === null || $value === '')) {
                continue;
            }

            foreach ($ruleArray as $rule) {
                if ($rule === 'nullable') continue;

                $params = [];
                if (strpos($rule, ':') !== false) {
                    [$ruleName, $paramString] = explode(':', $rule, 2);
                    $params = explode(',', $paramString);
                } else {
                    $ruleName = $rule;
                }

                $error = self::applyRule($field, $value, $ruleName, $params);
                if ($error) {
                    if (!isset($errors[$field])) {
                        $errors[$field] = [];
                    }
                    $errors[$field][] = $error;
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    private static function applyRule(string $field, mixed $value, string $rule, array $params): ?string {
        switch ($rule) {
            case 'required':
                if ($value === null || $value === '') {
                    return "The $field field is required.";
                }
                break;
            case 'string':
                if ($value !== null && !is_string($value)) {
                    return "The $field field must be a string.";
                }
                break;
            case 'integer':
                if ($value !== null && filter_var($value, FILTER_VALIDATE_INT) === false) {
                    return "The $field field must be an integer.";
                }
                break;
            case 'numeric':
                if ($value !== null && !is_numeric($value)) {
                    return "The $field field must be numeric.";
                }
                break;
            case 'email':
                if ($value !== null && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
                    return "The $field field must be a valid email address.";
                }
                break;
            case 'min':
                if ($value !== null && is_numeric($value) && $value < (float)$params[0]) {
                    return "The $field field must be at least {$params[0]}.";
                }
                break;
            case 'max':
                if ($value !== null && is_numeric($value) && $value > (float)$params[0]) {
                    return "The $field field must not be greater than {$params[0]}.";
                }
                break;
            case 'min_length':
                if ($value !== null && is_string($value) && strlen($value) < (int)$params[0]) {
                    return "The $field field must be at least {$params[0]} characters.";
                }
                break;
            case 'max_length':
                if ($value !== null && is_string($value) && strlen($value) > (int)$params[0]) {
                    return "The $field field must not exceed {$params[0]} characters.";
                }
                break;
            case 'in':
                if ($value !== null && !in_array((string)$value, $params, true)) {
                    return "The selected $field is invalid.";
                }
                break;
            case 'not_in':
                if ($value !== null && in_array((string)$value, $params, true)) {
                    return "The selected $field is invalid.";
                }
                break;
            case 'regex':
                if ($value !== null && !preg_match($params[0], $value)) {
                    return "The $field format is invalid.";
                }
                break;
            case 'date':
                if ($value !== null && strtotime($value) === false) {
                    return "The $field is not a valid date.";
                }
                break;
            case 'boolean':
                $bools = [true, false, 1, 0, '1', '0', 'true', 'false'];
                if ($value !== null && !in_array($value, $bools, true)) {
                    return "The $field field must be boolean.";
                }
                break;
            case 'unique':
                if ($value !== null && count($params) >= 2) {
                    $table = $params[0];
                    $column = $params[1];
                    $ignoreId = $params[2] ?? null;
                    
                    $sql = "SELECT COUNT(*) as count FROM $table WHERE $column = :val";
                    $sqlParams = ['val' => $value];
                    if ($ignoreId) {
                        $sql .= " AND id != :id";
                        $sqlParams['id'] = $ignoreId;
                    }
                    
                    $db = Database::getInstance();
                    $result = $db->fetch($sql, $sqlParams);
                    if ($result && $result['count'] > 0) {
                        return "The $field has already been taken.";
                    }
                }
                break;
            case 'exists':
                if ($value !== null && count($params) >= 2) {
                    $table = $params[0];
                    $column = $params[1];
                    $db = Database::getInstance();
                    $result = $db->fetch("SELECT COUNT(*) as count FROM $table WHERE $column = :val", ['val' => $value]);
                    if (!$result || $result['count'] == 0) {
                        return "The selected $field is invalid.";
                    }
                }
                break;
        }
        return null;
    }
}
