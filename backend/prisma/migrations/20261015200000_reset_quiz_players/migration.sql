-- Reseteo del Quiz al pasar al quiz mixto (peticion del usuario, 2026-10-15): se borra lo que ha jugado cada persona
-- (respuestas y participaciones), asi la clasificacion, el historial y el perfil empiezan de cero. Los quizzes y sus
-- preguntas se conservan; las preferencias de avisos del Quiz tambien.
DELETE FROM `quiz_answers`;
DELETE FROM `quiz_participations`;
