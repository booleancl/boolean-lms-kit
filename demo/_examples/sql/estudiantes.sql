-- title: Estudiantes (base .sqlite)
-- db: _db/estudiantes.sqlite

-- %% Todos
SELECT * FROM students;

-- %% Nacidos desde el 2000
SELECT name, date_of_birth
FROM students
WHERE date_of_birth >= '2000-01-01'
ORDER BY date_of_birth;
